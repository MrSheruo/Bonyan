import { get, post, patch, del } from "./client.js";

export function createResourceClient(basePath) {
  return {
    list: (query = "") => get(`${basePath}${query}`),
    get: (id) => get(`${basePath}/${id}`),
    create: (body) => post(basePath, body),
    update: (id, body) => patch(`${basePath}/${id}`, body),
    remove: (id) => del(`${basePath}/${id}`),
  };
}
