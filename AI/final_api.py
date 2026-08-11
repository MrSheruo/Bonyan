import os
import json
import itertools
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from warnings import filterwarnings
filterwarnings('ignore')
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()


class QueryRequest(BaseModel):
    budget: float
    categories: List[str]
    weights: Optional[List[float]] = None
    tier: Optional[str] = None
    notes: Optional[str] = None  # optional free-text style/preference notes


class QueryResponse(BaseModel):
    response: str


# ---------------------------------------------------------------------------
# Step 1 (instructions.docx): user preferences (budget, categories, weights,
# tier) come pre-structured from the backend / Node.js layer as JSON. This
# validates/normalizes that data and synthesizes the text query that the
# retrieval step will embed for semantic search (structured fields alone
# carry no free text, so a query string is generated from them; any optional
# free-text "notes" from the user are folded in too, since that's where
# semantic search actually adds value beyond the metadata filters).
# ---------------------------------------------------------------------------
def extract_user_preferences(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate structured preference data received from the backend and build
    a semantic search query text from it.

    Expected input shape:
        {
            "budget": number,
            "categories": [str, ...],
            "weights": [number, ...] | None,
            "tier": str | None,
            "notes": str | None   # optional free-text style/preference text
        }

    Returns: {'budget': number, 'categories': list, 'weights': list | None,
              'tier': str | None, 'query': str}

    Raises: ValueError if required fields are missing or malformed.
    """
    budget = data.get('budget')
    categories = data.get('categories')
    weights = data.get('weights')
    tier = data.get('tier')
    notes = data.get('notes')

    if not isinstance(budget, (int, float)) or isinstance(budget, bool) or budget <= 0:
        raise ValueError('budget must be a positive number.')

    if (
        not isinstance(categories, list)
        or not categories
        or not all(isinstance(c, str) and c.strip() for c in categories)
    ):
        raise ValueError('categories must be a non-empty list of strings.')
    categories = [c.strip() for c in categories]

    if weights is not None:
        if not isinstance(weights, list) or not all(isinstance(w, (int, float)) for w in weights):
            raise ValueError('weights must be a list of numbers if provided.')

    if tier is not None and (not isinstance(tier, str) or not tier.strip()):
        raise ValueError('tier must be a non-empty string if provided.')
    if isinstance(tier, str):
        tier = tier.strip()

    if notes is not None and not isinstance(notes, str):
        raise ValueError('notes must be a string if provided.')

    # build the base semantic-search query text from the structured fields;
    # per-category queries are derived from this in the endpoint since
    # retrieval() runs once per category
    query_parts = [f"منتجات بجودة {tier}"] if tier else ["منتجات"]
    if notes and notes.strip():
        query_parts.append(notes.strip())
    query = "، ".join(query_parts)

    return {
        'budget': budget,
        'categories': categories,
        'weights': weights,
        'tier': tier,
        'query': query,
    }


# ---------------------------------------------------------------------------
# Step 2 (instructions.docx): budget allocation across categories
# ---------------------------------------------------------------------------
def budget_allocation(
    budget: float,
    categories: List[str],
    weights: Optional[List[float]] = None,
) -> Dict[str, float]:
    """
    Allocate the total budget across the requested categories.

    - Single category -> the category receives the full budget.
    - Multiple categories -> category_budget = total_budget * category_weight.

    Returns: {category: category_budget, ...}
    """
    if not categories:
        raise ValueError('At least one category is required for budget allocation.')

    if len(categories) == 1:
        return {categories[0]: budget}

    if not weights or len(weights) != len(categories):
        raise ValueError(
            'Weights must be provided and match the number of categories '
            'when allocating budget across multiple categories.'
        )

    if abs(sum(weights) - 1.0) > 1e-6:
        raise ValueError('Weights must sum to 1.')

    return {category: budget * weight for category, weight in zip(categories, weights)}


# ---------------------------------------------------------------------------
# Step 3 (instructions.docx): filter data via Pinecone metadata filtering +
# semantic search, matching category, tier, and staying within that
# category's allocated budget. Called once per category since each category
# has its own budget.
# ---------------------------------------------------------------------------
def retrieval(
    query: str,
    pinecone_index,
    embeddings,
    category: str,
    budget: float,
    tier: Optional[str] = None,
    k: int = 5,
) -> List[Document]:
    """
    Semantic search with metadata filtering for a single category, ensuring
    results don't exceed that category's allocated budget (and match tier,
    if one was specified).

    Returns: list of langchain Documents retrieved from Pinecone.
    """
    filter_conditions = [
        {'category': {'$eq': category}},
        {'price_egp': {'$lte': budget}},
    ]
    if tier:
        filter_conditions.append({'tier': {'$eq': tier}})

    try:
        query_vector = embeddings.embed_query(query)
        results = pinecone_index.query(
            vector=query_vector,
            top_k=k,
            include_metadata=True,
            filter={'$and': filter_conditions},
        )

        matched_docs: List[Document] = []
        for match in results.get('matches', []):
            meta = match.get('metadata', {})
            content = (
                f"منتج: {meta.get('product_name', '')}، "
                f"فئة {meta.get('category', '')}، جودة {meta.get('tier', '')}، "
                f"السعر {meta.get('price_egp', '')} جنيه لكل {meta.get('unit', '')}. "
                f"المورّد: {meta.get('supplier_name', '')}، المدينة: {meta.get('city', '')}، "
                f"التقييم: {meta.get('rating', '')} من 5."
            )
            matched_docs.append(Document(page_content=content, metadata=meta))

        print(f'[Retrieval] Found {len(matched_docs)} products for category "{category}".')
        return matched_docs

    except Exception as e:
        print(f'[Retrieval] لا توجد منتجات متاحة حسب الميزانية المطلوبة لفئة "{category}": {e}')
        return []


# ---------------------------------------------------------------------------
# Step 4 (instructions.docx): content-based, constraint-driven ranking
# (category/budget/tier already enforced by the Pinecone filter above;
# this ranks the survivors by tier-match then rating).
# ---------------------------------------------------------------------------
def rank_products(docs: List[Document], tier: Optional[str] = None) -> List[Document]:
    def score(doc: Document):
        meta = doc.metadata
        tier_match = 1 if tier and meta.get('tier') == tier else 0
        rating = float(meta.get('rating', 0) or 0)
        return (tier_match, rating)

    return sorted(docs, key=score, reverse=True)


# ---------------------------------------------------------------------------
# Step 5 (instructions.docx): build product combinations per category whose
# total price doesn't exceed that category's (or the overall) budget.
# ---------------------------------------------------------------------------
def generate_combinations(
    docs: List[Document],
    budget: float,
    max_items: int = 3,
    max_combinations: int = 3,
) -> List[List[Document]]:
    """
    Build product combinations that stay within budget, preferring ones with
    a higher average rating, then tie-broken by greater budget utilization.
    """
    valid_combos = []
    for size in range(1, min(max_items, len(docs)) + 1):
        for combo in itertools.combinations(docs, size):
            total_price = sum(float(d.metadata.get('price_egp', 0) or 0) for d in combo)
            if total_price <= budget:
                avg_rating = sum(float(d.metadata.get('rating', 0) or 0) for d in combo) / len(combo)
                valid_combos.append((combo, total_price, avg_rating))

    # prefer higher average rating first, then combos that use more of the budget
    valid_combos.sort(key=lambda c: (c[2], c[1]), reverse=True)

    return [list(combo) for combo, _, _ in valid_combos[:max_combinations]]


# ---------------------------------------------------------------------------
# lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan_api(app: FastAPI):
    print('Starting up house helper chatbot API... ')

    # pinecone
    print('Initializing Pinecone...')
    pinecone_api_key = os.getenv('PINECONE_API_KEY')
    if not pinecone_api_key:
        raise RuntimeError('PINECONE_API_KEY is not set in the environment variables')
    pc = Pinecone(api_key=pinecone_api_key)
    print('Pinecone Initialized.')

    # Embeddings
    print('Initializing Embedding model...')
    gemini_embeddings_key = os.getenv('GEMINI_API_KEY_EMBEDDINGS')
    if not gemini_embeddings_key:
        raise RuntimeError('GEMINI_API_EMBEDDINGS is not set in the environment variables')
    embeddings = GoogleGenerativeAIEmbeddings(
        model='gemini-embedding-001',
        google_api_key=gemini_embeddings_key,
    )
    print('Embeddings Initialized.')

    # vector store / raw index
    print('Initializing Pinecone Vector Store...')
    index_name = 'bonyan'
    vecstore = PineconeVectorStore(index_name=index_name, embedding=embeddings)
    pinecone_index = pc.Index(index_name)
    print('Pinecone Vector Store Initialized.')

    # LLM
    print('Initializing LLM...')
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        raise RuntimeError('GEMINI_API_KEY is not set in the environment variables')
    llm = ChatGoogleGenerativeAI(
        model='gemini-2.5-flash',
        temperature=0.3,
        api_key=gemini_api_key,
    )
    print('LLM Initialized.')

    # Step 6 (instructions.docx): prompt used to format the final combinations
    # into a natural-language Arabic response
    prompt_template = """
أنت مساعد ذكي لتخصيص الميزانية واختيار منتجات التشطيب والأثاث المناسبة للمستخدم.

طلب المستخدم الأصلي: {query}

الميزانية الإجمالية: {total_budget} جنيه مصري

فيما يلي أفضل التوليفات المقترحة من المنتجات مقسّمة حسب الفئة، مع مراعاة عدم تجاوز
الميزانية المخصصة لكل فئة:

{combinations_text}

بناءً على هذه البيانات فقط، اكتب ردًا وديًا وواضحًا باللغة العربية يلخص للمستخدم:
- التوصية المقترحة لكل فئة (اسم المنتج، السعر، المورّد، التقييم)
- إجمالي التكلفة مقابل الميزانية المتاحة لكل فئة والميزانية الإجمالية
- أي ملاحظات مفيدة (مثال: عدم توفر منتجات ضمن الميزانية لفئة معينة)

وإذا لم تكن البيانات المتاحة كافية قل: عذرا, المعلومات المتاحة غير كافية, لا أستطيع مساعدتك فى الوقت الحالى..
"""
    PROMPT = PromptTemplate.from_template(prompt_template)
    print('Prompt Initialized')

    # attach everything to app state
    app.state.llm = llm
    app.state.vecstore = vecstore
    app.state.pinecone_index = pinecone_index
    app.state.embeddings = embeddings
    app.state.prompt = PROMPT

    print('House Helper Chatbot API is ready to receive queries.')
    yield
    print('Shutting down House Helper Chatbot API.')


app = FastAPI(
    title='House Helper Chatbot API',
    description='API for querying house helper chatbot',
    lifespan=lifespan_api,
)


@app.post('/query', response_model=QueryResponse)
async def ask(request: QueryRequest):
    llm = getattr(app.state, 'llm', None)
    pinecone_index = getattr(app.state, 'pinecone_index', None)
    embeddings = getattr(app.state, 'embeddings', None)
    PROMPT = getattr(app.state, 'prompt', None)

    if not all([llm, pinecone_index, embeddings, PROMPT]):
        raise HTTPException(
            status_code=503,
            detail='النظام لم يكتمل تحميله بعد, حاول مرة أخرى.',
        )

    # Step 1: validate structured preferences from the backend + build base query
    try:
        prefs = extract_user_preferences(request.model_dump_json()) # check for it when connecting to the database
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    budget = prefs['budget']
    categories = prefs['categories']
    weights = prefs['weights']
    tier = prefs['tier']
    base_query = prefs['query']

    # Step 2: budget allocation
    try:
        category_budgets = budget_allocation(budget, categories, weights)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Step 3 & 4: retrieval + ranking, per category
    category_results: Dict[str, List[Document]] = {}
    for category, cat_budget in category_budgets.items():
        category_query = f"{base_query} - فئة {category}"
        docs = retrieval(
            query=category_query,
            pinecone_index=pinecone_index,
            embeddings=embeddings,
            category=category,
            budget=cat_budget,
            tier=tier,
        )
        category_results[category] = rank_products(docs, tier)

    # Step 5: build the best combination per category within its budget
    combinations_text_parts = []
    for category, cat_budget in category_budgets.items():
        docs = category_results.get(category, [])
        combos = generate_combinations(docs, cat_budget)

        if not combos:
            combinations_text_parts.append(
                f"الفئة: {category} (الميزانية: {cat_budget:.0f} جنيه) - "
                f"لا توجد منتجات متاحة ضمن هذه الميزانية."
            )
            continue

        best_combo = combos[0]
        combo_lines = "\n".join(
            f"  - {d.metadata.get('product_name', '')} | السعر: {d.metadata.get('price_egp', '')} جنيه "
            f"| المورّد: {d.metadata.get('supplier_name', '')} | التقييم: {d.metadata.get('rating', '')}"
            for d in best_combo
        )
        combinations_text_parts.append(
            f"الفئة: {category} (الميزانية: {cat_budget:.0f} جنيه)\n{combo_lines}"
        )

    combinations_text = "\n\n".join(combinations_text_parts)

    # Step 6: format the final answer with Gemini
    final_prompt = PROMPT.format(
        query=base_query,
        total_budget=budget,
        combinations_text=combinations_text,
    )
    llm_response = llm.invoke(final_prompt)

    return QueryResponse(response=llm_response.content.strip())


@app.get('/')
async def health_check():
    return {'status': 'healthy', 'message': 'Chatbot is up!'}
