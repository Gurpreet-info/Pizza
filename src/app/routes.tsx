import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { RootLayout } from './layouts/RootLayout';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const MenuPage = lazy(() => import('./pages/MenuPage').then((m) => ({ default: m.MenuPage })));
const MenuItemPage = lazy(() => import('./pages/MenuItemPage').then((m) => ({ default: m.MenuItemPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() =>
  import('./pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const LocationsPage = lazy(() => import('./pages/LocationsPage').then((m) => ({ default: m.LocationsPage })));
const CouponsPage = lazy(() => import('./pages/CouponsPage').then((m) => ({ default: m.CouponsPage })));
const OffersPage = lazy(() => import('./pages/OffersPage').then((m) => ({ default: m.OffersPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const UserDashboardPage = lazy(() =>
  import('./pages/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage }))
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'menu', Component: MenuPage },
      { path: 'menu/:id', Component: MenuItemPage },
      { path: 'cart', Component: CartPage },
      { path: 'checkout', Component: CheckoutPage },
      { path: 'order-confirmation/:orderId', Component: OrderConfirmationPage },
      { path: 'locations', Component: LocationsPage },
      { path: 'coupons', Component: CouponsPage },
      { path: 'offers', Component: OffersPage },
      { path: 'login', Component: LoginPage },
      { path: 'dashboard', Component: UserDashboardPage },
      { path: 'admin', Component: AdminPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
