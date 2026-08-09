import os
import time
import json
import pandas as pd
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from warnings import filterwarnings
filterwarnings("ignore")

load_dotenv()

DATA_PATH = os.path.join('data', 'Bonyan.xlsx')
data = pd.read_excel(DATA_PATH)

print(f'Loaded {len(data)} rows.')


def create_documents(data: pd.DataFrame) -> list[Document]:
    """Create a list of Document objects from the DataFrame."""
    documents = []
    for _, row in data.iterrows():
        content = (
            f"منتج : {row['Product_Name']}، "
            f"فئة {row['Category']}، جودة {row['Tier']}، "
            f"السعر {row['Price_EGP']} جنيه لكل {row['Unit']}. "
            f"المورّد: {row['Supplier_Name']}، المدينة: {row['City']}، "
            f"التقييم: {row['Rating']} من 5."
        )
        metadata = {
            "product_id": str(row["Product_ID"]),
            "product_name": row["Product_Name"],
            "category": row["Category"],
            "tier": row["Tier"],
            "price_egp": row["Price_EGP"],
            "unit": row["Unit"],
            "supplier_name": row["Supplier_Name"],
            "city": row["City"],
            "rating": row["Rating"],
        }
        documents.append(Document(page_content=content, metadata=metadata))
    return documents


docs = create_documents(data)
print(f'Created {len(docs)} documents.')

# create embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY_EMBEDDINGS"),
)

# initialize Pinecone
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pc = Pinecone(api_key=pinecone_api_key)

index_name = "bonyan"
EMBEDDING_DIM = 3072  # default output dimension of gemini-embedding-001

# create index if it doesn't exist
existing_indexes = [i['name'] for i in pc.list_indexes()]
if index_name not in existing_indexes:
    pc.create_index(
        name=index_name,
        dimension=EMBEDDING_DIM,
        metric='cosine',
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )
    print(f'Created index {index_name}.')
else:
    print(f'Index {index_name} already exists.')

# vector store (created once, reused across batches)
vecstore = PineconeVectorStore(index_name=index_name, embedding=embeddings)

# upload documents to Pinecone
print('Uploading docs to pinecone...')

PROGRESS_FILE = 'progress.json'


def save_progress(batch_num: int):
    """Save the last successfully uploaded batch number (Due to Gemini limitations)."""

    with open(PROGRESS_FILE, 'w') as f:
        json.dump({'last_uploaded_batch': batch_num}, f)


def load_progress() -> int:
    """Load the last successfully uploaded batch number.
    Return 0 if no progress file exists (or if it's missing the expected key)."""

    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            data = json.load(f)
            last = data.get('last_uploaded_batch', 0)
            print(f'Loaded progress. Resume from batch {last + 1}.')
            return last
    return 0


def upload_documents(docs, vecstore, index_name):
    """Upload documents to Pinecone in batches of 50 due to Gemini limitations.

    Uses each product's product_id as the explicit Pinecone vector ID so
    re-running the pipeline updates existing vectors (upsert) instead of
    creating duplicates.
    """

    batch_size = 50
    max_tries = 5     # max retries per batch before giving up
    base_wait = 60    # start wait in sec
    success_wait = 1  # wait after successful upload in sec

    total_batches = -(-len(docs) // batch_size)  # ceiling division
    start_batch = load_progress()

    print(f'[Upload] Total batches to upload: {total_batches} of size {batch_size}.')
    print(f'[Upload] Starting upload from batch {start_batch + 1}')

    for i in range(start_batch * batch_size, len(docs), batch_size):
        batch_number = i // batch_size + 1
        batch = docs[i:i + batch_size]
        batch_ids = [doc.metadata['product_id'] for doc in batch]
        retries = 0

        while retries <= max_tries:
            try:
                print(f'[Batch {batch_number}/{total_batches}] Uploading {len(batch)} documents...')
                vecstore.add_documents(documents=batch, ids=batch_ids)

                print(f'[Batch {batch_number}/{total_batches}] Uploaded successfully.')
                save_progress(batch_number)
                time.sleep(success_wait)
                break  # exit retry loop on success

            except Exception as e:
                error_message = str(e)
                is_rate_limit = "429" in error_message or "RESOURCE_EXHAUSTED" in error_message
                if is_rate_limit and retries < max_tries:
                    wait_time = base_wait * (2 ** retries)  # exponential backoff
                    print(f'[Batch {batch_number}/{total_batches}] Rate limit hit. Waiting {wait_time} seconds before retrying...')
                    time.sleep(wait_time)
                    retries += 1

                else:
                    print(f'[Batch {batch_number}] Failed after {retries} attempts: {e}')
                    print(f'[Upload] Progress saved. You can resume from batch {batch_number} when rerun.')
                    raise

    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
    print('[Upload] All batches uploaded successfully.')


# calling
upload_documents(docs, vecstore, index_name)

print('All documents uploaded. Pipeline finished successfully.')
