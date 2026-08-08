import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/db.js", () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        transaction: vi.fn(),
    },
}));
vi.mock("@/shared/upload/storage.service.js", () => ({
    compressImage: vi.fn(),
    uploadToStorage: vi.fn(),
    deleteFromStorage: vi.fn(),
}));

import { db } from "@/db/db.js";
import {
    compressImage,
    uploadToStorage,
    deleteFromStorage,
} from "@/shared/storage/storage.service.js";

import {
    createProductWithImages,
    getProductById,
} from "./products.service.js";
import { NotFoundError, ValidationError } from "@/shared/errors.js";

describe("createProductWithImages", () => {
    beforeEach(() => vi.clearAllMocks());

    it("throws ValidationError with zero images, never touches storage or DB", async () => {
        await expect(createProductWithImages({ name: "Chair", categoryId: "x" } as any, [])).rejects.toThrow(
            ValidationError
        );
        expect(compressImage).not.toHaveBeenCalled();
        expect(db.transaction).not.toHaveBeenCalled();
    });

    it("uploads images then inserts product+images in one transaction", async () => {
        (compressImage as any).mockResolvedValue(Buffer.from("compressed"));
        (uploadToStorage as any).mockResolvedValue({ path: "img1.webp", publicUrl: "https://x/img1.webp" });

        const mockTx = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([{ id: "prod-1" }]),
        };
        (db.transaction as any).mockImplementation(async (cb: any) => cb(mockTx));

        const result = await createProductWithImages(
            { name: "Chair", categoryId: "cat-1" } as any,
            [Buffer.from("raw")]
        );

        expect(uploadToStorage).toHaveBeenCalledTimes(1);
        expect(db.transaction).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ id: "prod-1" });
        expect(deleteFromStorage).not.toHaveBeenCalled();
    });

    it("deletes uploaded files if the transaction fails", async () => {
        (compressImage as any).mockResolvedValue(Buffer.from("compressed"));
        (uploadToStorage as any).mockResolvedValue({ path: "img1.webp", publicUrl: "https://x/img1.webp" });
        (db.transaction as any).mockRejectedValue(new Error("DB down"));

        await expect(
            createProductWithImages({ name: "Chair", categoryId: "cat-1" } as any, [Buffer.from("raw")])
        ).rejects.toThrow("DB down");

        expect(deleteFromStorage).toHaveBeenCalledWith("img1.webp");
    });
});

describe("getProductById", () => {
    beforeEach(() => vi.clearAllMocks());

    it("throws NotFoundError when the product doesn't exist", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([]),
        });

        await expect(getProductById("missing-id")).rejects.toThrow(NotFoundError);
    });

    it("applies the active discount to listing effectivePrice", async () => {
        const productRow = [{ product: { id: "p1" }, category: { id: "c1" } }];
        const images: any[] = [];
        const listingRows = [{ listing: { price: "100.00" }, store: { id: "s1" } }];
        const activeDiscount = [{ percentage: "10.00" }];

        let call = 0;
        (db.select as any).mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockImplementation(() => {
                call += 1;
                if (call === 1) return Promise.resolve(productRow);
                return {
                    orderBy: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue(activeDiscount),
                    // for images/listings calls without orderBy/limit chaining needs:
                    then: (resolve: any) => resolve(call === 2 ? images : listingRows),
                };
            }),
        }));

        const result = await getProductById("p1");

        expect(result.listings[0]!.effectivePrice).toBe(90);
    });
});