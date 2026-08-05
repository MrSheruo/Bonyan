import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "@/app.js";

describe("POST /auth/register", () => {
    it("registers a new user", async () => {
        const res = await request(app).post("/auth/register").send({
            name: "Test", email: `test${Date.now()}@test.com`, password: "password123",
        });
        expect(res.status).toBe(201);
    });

    it("rejects duplicate email", async () => {
        const email = `dup${Date.now()}@test.com`;
        await request(app).post("/auth/register").send({ name: "A", email, password: "password123" });
        const res = await request(app).post("/auth/register").send({ name: "B", email, password: "password123" });
        expect(res.status).toBe(409);
    });

    it("rejects missing fields", async () => {
        const res = await request(app).post("/auth/register").send({ email: "x@test.com" });
        expect(res.status).toBe(400);
    });
});