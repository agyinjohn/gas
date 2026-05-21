# Quick Order by Amount - Feature Implementation

## Overview

The Quick Order system has been completely redesigned to streamline the gas ordering process. Instead of selecting preset cylinder sizes, users can now specify the amount they want to spend, and the system automatically finds the nearest station and suggests an appropriate cylinder option.

## User Flow

### Step 1: Home Page - Quick Order Options
Users see two cards under the "Quick Order" section:
- **"New Gas Refill"** - Traditional flexible ordering (existing checkout flow)
- **"Quick Order By Amount"** - New simplified flow based on budget

### Step 2: Amount Input Modal
When clicking "Quick Order By Amount":
1. User enters the amount in GHS they want to spend (e.g., 50)
2. System displays helpful hint: "We'll find the nearest station and suggest the best option for you"
3. Clicking "Find Station & Confirm" triggers the search

### Step 3: Station Discovery
The backend:
1. Gets user's current location (auto-detected or manually set)
2. Fetches nearby stations sorted by distance (within configurable radius)
3. For each station (starting with nearest):
   - Gets all available cylinder listings
   - Finds the **first cylinder with price >= entered amount**
   - If found and in stock → uses this station
   - If not → tries next nearest station
4. If no match found → shows error: "Nearest station's minimum amount is ₵X"

### Step 4: Order Confirmation Screen
Shows:
- **Station Card** - Name, address, distance
- **Order Summary**:
  - Cylinder size and price
  - Delivery fee (calculated from distance)
  - Total amount in orange
- **Delivery Location** - Auto-filled with user's current location, changeable
- **Photo Upload** (Optional) - Click to capture/upload photo for rider
- **Action Buttons** - Back or Place Order

### Step 5: Order Placement
Clicking "Place Order":
- Creates order with:
  - Suggested station
  - Cylinder size/quantity at the matched price
  - User's current location (pickup = delivery)
  - Schedule: ASAP (no scheduling UI in this flow)
  - Optional photo URL
- Shows success toast
- Closes modal and returns to home

---

## Implementation Details

### Frontend Components

**`QuickOrderModal.tsx`** - New modal component
- **State Management**:
  - `step`: 'amount' | 'confirm' | 'loading'
  - `amount`: User's entered budget
  - `station`: Selected station object
  - `selectedCylinder`: Size/price/quantity
  - `userLocation`/`deliveryLocation`: Address objects
  - `photoUrl`: Uploaded photo URL
  - `sameAsPickup`: Location toggle (simplified - always same in this flow)
  - `placingOrder`: Loading state for submit
  
- **Key Functions**:
  - `handleFindStation()`: Gets location, finds nearby stations, matches cylinder
  - `handlePhotoCapture()`: Opens photo picker, uploads to server
  - `handlePlaceOrder()`: Calls `ordersApi.create()` with order payload
  
- **Location Picker**: Nested picker modal for changing delivery address

**`page.tsx`** (Home page)
- New Quick Order section shows only 2 cards:
  - "New Gas Refill" → `checkout?source=quick` (existing)
  - "Quick Order By Amount" → Opens QuickOrderModal
- Removed: Preset size cards (6kg, 7kg, etc.)
- State: `showQuickOrder` boolean

### Backend

No new endpoints needed. Uses existing:
- `GET /api/v1/stations/nearby` - Station discovery
- `POST /api/v1/orders` - Order creation

### API Payload (ordersApi.create)

```typescript
{
  stationId: string;           // UUID of selected station
  cylinders: [{
    size: number;              // e.g., 6, 12, 19
    quantity: number;           // Always 1 for quick orders
    customPrice: number;        // Exact matched price
  }];
  orderType: 'delivery';
  pickupAddress: {
    street: string;
    city: string;
    lat: number;
    lng: number;
  };
  deliveryAddress: {           // Same as pickup by default
    street: string;
    city: string;
    lat: number;
    lng: number;
  };
  paymentMethod: 'mobile_money' | 'card' | 'cash';
  deliveryPhotoUrl?: string;   // Optional photo
  isScheduled: false;
}
```

---

## Benefits

| Aspect | Impact |
|--------|--------|
| **Onboarding** | Reduced from 5-7 steps to 2 steps |
| **Friction** | No manual station selection needed |
| **Clarity** | Delivery fee shown before confirmation |
| **Flexibility** | Location still changeable if needed |
| **Recovery** | Clear error messages for insufficient budget |
| **Consistency** | Uses existing order creation system |

---

## Error Handling

1. **Invalid Amount** → "Enter a valid amount"
2. **No Location** → "Could not get your location"
3. **No Nearby Stations** → "No stations found nearby"
4. **Budget Too Low** → "Nearest station's minimum amount is ₵X"
5. **Order Creation Fails** → Shows server error message
6. **Photo Upload Fails** → Shows upload error, can proceed without photo

---

## Testing Checklist

- [x] Modal opens when "By Amount" button clicked
- [x] Amount input field validates
- [x] Station finder logic correct
- [x] Confirmation screen displays properly
- [x] Location change works
- [x] Photo upload flow (assuming photo service works)
- [ ] Order creation succeeds with authenticated user
- [ ] Order appears in user's order history
- [ ] Delivery fee calculation is correct
- [ ] Out-of-stock handling (move to next station)
- [ ] Multiple amounts edge cases (minimum amount warning)

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/components/QuickOrderModal.tsx` | NEW - Modal component |
| `frontend/src/app/user/page.tsx` | Removed preset size cards, added Quick Order modal trigger |

---

## Configuration

Currently hardcoded:
- Default radius: 25km (in getNearby API)
- Payment method: 'mobile_money'
- Order type: 'delivery'
- Schedule: ASAP (isScheduled: false)
- Delivery location: Same as pickup (sameAsPickup behavior)

These can be made configurable in future if needed.

---

## Future Enhancements

1. Allow custom schedule selection (currently ASAP only)
2. Show price variation across stations for same cylinder
3. Store "favorite" quick order amounts
4. Bulk discounts if buying multiple cylinders
5. Loyalty points preview before confirming
6. Real-time stock availability updates
7. Estimated delivery time display
