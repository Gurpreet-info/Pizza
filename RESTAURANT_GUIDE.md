# Delicious Bites - Restaurant Ordering System

A complete restaurant online ordering system with customizable menu items, cart management, checkout, and an admin panel for managing everything.

## 🎯 Features

### Customer Features
- **Browse Menu**: View menu items organized by categories (Pizza, Burgers, Pasta, Salads, Drinks)
- **Item Customization**: 
  - Select required options (e.g., Size)
  - Add multiple toppings/extras with price adjustments
  - Add special instructions
  - Real-time price calculation
- **Shopping Cart**: Add, remove, and adjust quantities
- **Checkout**: 
  - Choose pickup or delivery
  - Select pickup location or enter delivery address
  - Enter customer information
  - Payment form (demo mode - ready for integration)
- **Order Confirmation**: View order details and status
- **User Dashboard**: Track order history
- **Multiple Locations**: View all restaurant locations with details

### Admin Features
- **Menu Items Management**: Create, edit, delete menu items
- **Categories Management**: Organize menu items by category
- **Options Management**:
  - Create option groups (Size, Toppings, Add-ons, etc.)
  - Set single or multiple selection
  - Mark as required/optional
  - Set min/max selections for multiple choice
  - Add individual options with pricing
- **Locations Management**: Manage restaurant locations
- **Orders Management**: View and update order status

## 🚀 Getting Started

### Demo Accounts

**Admin Account:**
- Email: `admin@restaurant.com`
- Password: `admin123`

**Or create your own customer account via the Register tab**

## 📱 Pages & Routes

- `/` - Home page with hero and categories
- `/menu` - Browse all menu items by category
- `/menu/:id` - Customize and add item to cart
- `/cart` - View cart and proceed to checkout
- `/checkout` - Complete order with payment
- `/order-confirmation/:orderId` - Order confirmation page
- `/locations` - View all restaurant locations
- `/login` - Login or register
- `/dashboard` - User order history
- `/admin` - Admin panel (requires admin login)

## 🎨 Customization System

### How Item Customization Works

1. **Option Groups**: Groups of related options (e.g., "Size", "Toppings")
   - **Single Select**: Customer must choose one (e.g., Small, Medium, Large)
   - **Multiple Select**: Customer can choose several (e.g., Extra Cheese, Mushrooms, Olives)

2. **Options**: Individual choices within a group
   - Each option can have an additional price
   - Price is added to the base item price

3. **Example**: Margherita Pizza
   - Base price: $12.99
   - Size (required, single): Small (+$0), Medium (+$3), Large (+$5)
   - Extra Toppings (optional, multiple, max 5): Extra Cheese (+$1.50), Mushrooms (+$1.50), etc.

## 💳 Payment Integration

The checkout includes a payment form structure ready for integration with Canadian payment processors:

### Recommended Payment Processors for Canada:
- **Stripe** - Full-featured, supports Canadian cards and Interac
- **Square** - Great for retail + online
- **Moneris** - Popular Canadian processor

### Integration Steps:
1. Sign up for a payment processor account
2. Get API keys (test and production)
3. Install the payment SDK
4. Replace the demo payment form with the processor's payment element
5. Handle payment confirmation and order creation

## 🗄️ Data Structure

### Menu Item
- Name, description, base price
- Category assignment
- Availability status
- Image

### Option Group
- Name (e.g., "Size", "Toppings")
- Associated menu item
- Type: single or multiple select
- Required/optional
- Min/max selections (for multiple)

### Option
- Name (e.g., "Large", "Extra Cheese")
- Associated option group
- Additional price

### Order
- Customer information
- Order items with selected options
- Order type (pickup/delivery)
- Status tracking
- Total with tax (13% HST)

## 🔒 Tax Calculation

The system calculates 13% HST (Harmonized Sales Tax) applicable in Ontario, Canada. Adjust the tax rate in the code if operating in a different province.

## 📦 Technology Stack

- **React** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Radix UI** - UI components
- **LocalStorage** - Data persistence (frontend only)
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## 🎛️ Admin Panel Guide

### Managing Menu Items
1. Go to Admin Panel → Menu Items tab
2. Click "Add Item" to create new menu items
3. Fill in name, description, price, category, and availability
4. Edit or delete existing items

### Creating Customization Options
1. Go to Admin Panel → Options tab
2. Create an Option Group:
   - Choose the menu item
   - Name the group (e.g., "Size")
   - Set type (single/multiple)
   - Mark as required if needed
3. Add Options to the group:
   - Name each option (e.g., "Large")
   - Set additional price
   - Repeat for all options in the group

### Managing Orders
1. Go to Admin Panel → Orders tab
2. View all orders with customer details
3. Update order status as it progresses:
   - Pending → Confirmed → Preparing → Ready → Completed

## 🌟 Tips for Customization

- Images: Replace placeholder images with your own restaurant photos
- Colors: Adjust the orange theme color in the code to match your branding
- Categories: Add or remove categories based on your menu
- Tax Rate: Update the 0.13 (13%) tax calculation for your region
- Locations: Add all your restaurant locations
- Options: Create comprehensive option groups for full customization

## 📝 Notes

- This is a frontend-only implementation with localStorage
- For production, integrate with a real backend database (Supabase, Firebase, etc.)
- Payment processing requires integration with a payment provider
- Consider adding email notifications for orders
- Add Google Maps integration for locations
- Implement real-time order tracking
- Add promotional codes/discounts feature
- Implement user reviews and ratings

## 🚧 Future Enhancements

- Backend database integration
- Real payment processing
- Email/SMS notifications
- Real-time order updates
- Loyalty program
- Delivery tracking
- Multi-language support
- Dark mode
- Mobile app version
