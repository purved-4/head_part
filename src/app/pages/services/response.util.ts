// response.util.ts
export function pluckData<T = any>(res: any): T {
  const data = res?.data;
  if (data && typeof data === "object") {
    (data as any).message = res?.message;
  }
  return data;
}

export function pluckDataOrEmpty<T = any>(res: any): T {
  const data = res?.data ?? [];
  if (data && typeof data === "object") {
    (data as any).message = res?.message;
  }
  return data;
}