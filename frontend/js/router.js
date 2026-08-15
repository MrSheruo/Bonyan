import { routes } from "./script.js";
import { render as homePage } from "./pages/home.js";
import { render as categoryPage } from "./pages/category_page.js";
import { render as productPage } from "./pages/product_page.js";
import { render as cartPage } from "./pages/cart.js";
import { render as chatbotPage } from "./pages/chatbot.js";
import { render as weddingPage } from "./pages/wedding.js";
import { render as budgetPage } from "./pages/budget.js";
import { createIcons } from "lucide";
import { APP_ICONS } from "./utils/icons.js";
import { render as fashionPage } from "./pages/fashion.js";
const routeDefs = [
  { path: "/home", handler: homePage },
  { path: "/fashion", handler: fashionPage },
  { path: "/category/:name", handler: categoryPage },
  { path: "/product/:id", handler: productPage },
  { path: "/cart", handler: cartPage },
  { path: "/chatbot", handler: chatbotPage },
  { path: "/wedding", handler: weddingPage },
  { path: "/budget", handler: budgetPage },
];

function matchRoute(path) {
  for (const route of routeDefs) {
    const paramNames = [];
    const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler: route.handler, params };
    }
  }
  return null;
}
export async function router() {
  let path = window.location.pathname;
  if (path === "/" || path === "") {
    history.replaceState(null, null, "/home");
    path = "/home";
  }

  const content = document.getElementById("content");
  const matched = matchRoute(path);

  if (!matched) {
    content.innerHTML =
      "<h1 class='p-8 text-center text-2xl'>Page Not Found 404</h1>";
    return;
  }

  try {
    const result = await matched.handler(matched.params, content);
    if (typeof result === "string") {
      content.innerHTML = result;
    }
  } catch (err) {
    console.error(err);
    content.innerHTML =
      "<p class='p-8 text-center'>Something went wrong loading this page.</p>";
  }

  createIcons({ icons: APP_ICONS });

  document.querySelectorAll("[data-link]").forEach((link) => {
    const hrefvalue = link.getAttribute("href");
    const isActive =
      path === hrefvalue || (hrefvalue !== "/" && path.startsWith(hrefvalue));
    link.classList.toggle("border-b-2", isActive);
    link.classList.toggle("border-[#524310]", isActive);
    link.classList.toggle("font-bold", isActive);
    link.classList.toggle("pb-1", isActive);
    link.classList.toggle("px-1", isActive);
  });
}

export function navigateTo(url) {
  window.history.pushState(null, null, url);
  router();
}

export function initRouter() {
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
      e.preventDefault();
      navigateTo(link.href);
    }
  });
  window.addEventListener("popstate", router);
  router();
}
