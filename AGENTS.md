# AGENTS.md — Product Requirements & User Flow (Hostel Surplus Food App)

## 1. Product Purpose & Problem Statement
- **Goal:** Prevent cooked food wastage in college hostel messes by connecting kitchen vendors with nearby NGOs after every meal slot (**Breakfast, Lunch, Snacks, Dinner**).
- **Core Value Proposition:** Give low-tech kitchen staff a zero-friction way to log leftover food in seconds, pack it accurately using standardized custom utensils, verify that it reaches recipients, and maintain automated donation records for hostel supervisors.

---

## 2. Target Persona & Operational Constraints
- **Primary User:** Hostel mess vendors and kitchen staff.
- **Tech Literacy:** Low. Users work in fast-paced, hot, noisy kitchens with wet/greasy hands and cannot type long text strings or calculate weights.
- **Language:** Simple, action-oriented English.
- **Operational Ground Realities:**
  - **Fixed Weekly Menu:** Hostels follow a fixed weekly timetable. The system knows which dishes are cooked for every meal slot on any given day.
  - **Custom Utensil Standard:** Vendors do not weigh food in `kg` or `gm`. They measure surplus using **Custom Utensils** (e.g., `0.5`, `1`, `2+` utensils). The system automatically calculates weight (`kg`) and meals served in the background.
  - **Multi-NGO Marketplace:** Surplus food is broadcasted to multiple nearby NGOs. Multiple NGOs can claim portions of a single meal's surplus.
  - **Delivery Partner Verification:** NGOs do not use the app. A logistics/delivery partner picks up the food from the hostel and confirms final delivery at the NGO location.

---

## 3. Core Use Cases (3-Tab Architecture)

### Use Case 1: Quickly Log Surplus Food (Tab 1)
- Allow the vendor to select leftover dishes from the current meal slot's pre-loaded menu without typing.
- Capture food quantity strictly in **Custom Utensil** increments.
- Optionally capture a quick photo of the food to build trust with claiming NGOs.
- Broadcast the available surplus to nearby NGOs in one tap.

### Use Case 2: Pack Orders & Track Recipient Delivery (Tab 2)
- Provide clear packing instructions once one or more NGOs claim the broadcasted food.
- Show NGO details (name, distance, intended recipient group) and delivery partner details (name, ETA, contact).
- Manage the physical handover of filled custom utensils and track the return of clean empty utensils.
- Provide closed-loop visibility confirming that the delivery partner handed the food over to the NGO.

### Use Case 3: Track Past Donations & Report to Supervisors (Tab 3)
- Maintain an automated log of completed orders across **Daily, Weekly, and Monthly** views.
- Translate raw order counts and utensil numbers into meaningful impact metrics (total orders, total weight saved, estimated people fed) for personal satisfaction.
- Enable 1-tap report sharing so vendors can send weekly/monthly proof of waste reduction to Hostel Wardens or supervisors.

---

## 4. End-to-End User Flow

### Phase 1: Meal Slot Trigger & Dish Selection
1. **Post-Meal Prompt:** Shortly after a meal service ends (Breakfast, Lunch, Snacks, or Dinner), the vendor opens the app (or taps a push notification).
2. **Auto-Context Detection:** The app automatically selects the current day and meal slot based on system time and displays that meal's fixed menu items.
3. **Zero-Surplus Exit (Fast Path):** If no food is left over, the vendor taps a single option to log "No Surplus" for that meal, completing their task in 1 tap.
4. **Dish Selection:** If food is left over, the vendor taps the specific dishes from the pre-loaded list that have surplus.

### Phase 2: Quantity Input & Broadcast
1. **Utensil Count Selection:** For each selected dish, the vendor selects how many **Custom Utensils** are filled (e.g., half, 1, 2, 3+).
2. **Optional Photo Capture:** The vendor optionally snaps a live photo of the filled utensils (can be skipped without blocking submission).
3. **Broadcast Submission:** The vendor submits the surplus. The listing goes live to nearby NGOs, and the vendor is routed to the Active Orders view.

### Phase 3: NGO Matching & Order Packing
1. **Wait / Broadcast State:** The app shows the posted dishes waiting for nearby NGO claims, paired with a food-safety countdown timer.
2. **Order Generation:** When an NGO claims all or part of the surplus, the system generates an **Active Pickup Order** and assigns a delivery partner.
3. **Packing Execution:** The vendor views the order details (NGO name, recipient details, and exact number of custom utensils to pack per dish) and seals the custom utensils.
4. **Ready Confirmation:** The vendor marks the order as **Packed & Ready for Pickup**.

### Phase 4: Handover & Utensil Swap
1. **Rider Arrival:** The delivery partner arrives at the hostel mess gate.
2. **Utensil Exchange:** The vendor hands over the filled custom utensils and collects an equal number of clean empty utensils back from the delivery partner.
3. **Pickup Confirmation:** Both parties confirm the handover, shifting the order status to **In Transit**.

### Phase 5: Recipient Visibility & Record Archiving
1. **Drop-Off Verification:** Upon reaching the NGO, the delivery partner marks the order delivered and uploads a handover confirmation photo.
2. **Vendor Notification:** The vendor receives a confirmation alert showing that the food reached the intended NGO recipients.
3. **History Logging:** The completed order immediately increments the vendor's **Daily, Weekly, and Monthly** counters in the Records tab.

---

## 5. Edge Cases & System Handling Rules

### 5.1 Partial NGO Claims (Split Orders)
- **Scenario:** A vendor posts 4 utensils of food, and NGO A only claims 2 utensils.
- **Handling:**
  - Immediately create an Active Packing Order for NGO A (2 utensils) so packing isn't delayed.
  - Keep the remaining 2 utensils active in the broadcast pool for other nearby NGOs to claim as a separate order.

### 5.2 Quantity Reduction After Posting (Late Student Rush)
- **Scenario:** After the vendor posts 3 utensils of surplus, late hostel students arrive and eat 1 utensil of food before the rider arrives.
- **Handling:**
  - Allow the vendor to reduce the utensil count or cancel an unclaimed/in-progress order directly from the Active Orders tab.
  - Instantly push the updated utensil count to the assigned NGO and delivery partner.

### 5.3 Unclaimed Food & Spoilage Window (TTL Expiry)
- **Scenario:** No nearby NGO claims the posted surplus before the food becomes unsafe to consume or before the next meal prep begins.
- **Handling:**
  - Enforce a strict **2-hour Time-to-Live (TTL)** countdown per meal slot.
  - Automatically expire unclaimed listings when the timer hits zero and instruct the vendor to safely compost/dispose of the food.

### 5.4 Custom Utensil Return Deficit
- **Scenario:** The delivery partner picks up 3 full utensils but forgets to bring 3 clean empty utensils to swap, risking a utensil shortage in the kitchen for the next meal.
- **Handling:**
  - During handover confirmation, let the vendor flag if empty utensils were **not** returned.
  - Track the kitchen's net utensil balance and alert logistics to return the missing empty utensils on the next pickup.

### 5.5 Off-Timetable / Festival Dishes
- **Scenario:** The mess cooks a special dish (e.g., festival sweets or a last-minute ingredient swap) not present in the fixed weekly timetable.
- **Handling:**
  - Provide an **"Add Custom Dish"** fallback in Tab 1 using voice-to-text or quick category selection so the vendor is never blocked by the fixed schedule.

### 5.6 Delivery Partner Delay or No-Show
- **Scenario:** An NGO claims the food and the vendor packs the utensils, but the delivery partner is stuck in traffic or unresponsive.
- **Handling:**
  - Provide a direct 1-tap **Call Delivery Partner** action and a **Request Reassignment** trigger if the rider exceeds the ETA threshold.

### 5.7 Poor Network Connectivity in Hostel Kitchens
- **Scenario:** Ground-floor or basement hostel kitchens have intermittent mobile data, causing photo uploads or post submissions to hang.
- **Handling:**
  - Use an **offline-first queue**: transmit lightweight text payload (dish IDs + utensil counts) first, confirm locally on screen, and upload optional photos asynchronously in the background when connectivity stabilizes.