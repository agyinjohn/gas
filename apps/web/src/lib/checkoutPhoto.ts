// In-memory store for the checkout photo — avoids sessionStorage quota limits
let _photo: string | null = null;

export const checkoutPhoto = {
  set: (data: string | null) => { _photo = data; },
  get: () => _photo,
  clear: () => { _photo = null; },
};
