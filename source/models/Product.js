import { Schema, Types, model } from "mongoose";

const SizeSchema = new Schema(
  {
    size: { type: String, required: true },
    stock: { type: Number, required: true },
  },
  { _id: true, timestamps: false }
);

const VariantSchema = new Schema(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
    colorThumbnail: { type: String, required: true },
    sizes: [SizeSchema],
    images: { type: [String], required: true },
  },
  { _id: true, timestamps: false }
);

const PriceSchema = new Schema(
  {
    original: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountQuantity: { type: Number, default: 0 },
    currency: { type: String, default: "VND", required: true },
  },
  { _id: true, timestamps: false }
);

const CommentSchema = new Schema(
  {
    user_id: { type: Types.ObjectId, ref: "User", required: true },
    user_name: { type: String, required: true },
    content: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "FLAGGED"],
      default: "PENDING",
    },
    replyContentAdmin: { type: String, default: "" },
    likes: [{ type: Types.ObjectId, ref: "User" }],
    issues: [
      {
        type: String,
        enum: ["INAPPROPRIATE", "SPAM", "OFFENSIVE", "MISLEADING", "OTHER"],
      },
    ],
    replies: [{ type: Types.ObjectId }],
    parent_id: { type: Types.ObjectId, default: null },
    images: [{ type: String }],
    verified_purchase: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const ProductSchema = new Schema(
  {
    product_type_id: { type: Types.ObjectId, required: false },
    material_id: {
      type: Types.ObjectId,
      ref: "Material",
      required: true,
    },
    category_id: {
      type: Types.ObjectId,
      ref: "Category",
      required: true,
    },
    order_id: {
      type: Types.ObjectId,
      ref: "Order",
    },
    name: { type: String, required: true },
    price: { type: PriceSchema, required: true },
    thumb: { type: String, required: false },
    variants: [VariantSchema],
    total_quantity: { type: Number, required: true },
    total_star: { type: Number, default: 5 },
    comments: [CommentSchema],
    description: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tagIsNew: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "Products",
  }
);

ProductSchema.index({ category_id: 1 });
ProductSchema.index({ name: "text", description: "text" });

export const Product = model("Product", ProductSchema);
