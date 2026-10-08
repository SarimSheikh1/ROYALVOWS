import { z } from "zod";
export async function listPage(query: any, req: any) {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1)
    .parse(req.query.page);
  const pageSize = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .parse(req.query.pageSize);
  const total = await query.model.countDocuments(query.getFilter());
  const data = await query.skip((page - 1) * pageSize).limit(pageSize);
  return {
    data,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}
