import React from 'react';
import { Link } from 'react-router';
import { ShoppingCart, User, Menu, LogOut, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from './ui/sheet';

export function Header() {
  const { cart, user, logout } = useApp();
  const canAccessAdmin = user?.role === 'admin' || user?.role === 'manager';
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="text-2xl font-bold text-orange-600">
            🍕 Pizza Offers
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium hover:text-orange-600 transition-colors">
            Home
          </Link>
          <Link to="/popularpizza-menu" className="text-sm font-medium hover:text-orange-600 transition-colors">
            Menu
          </Link>
          <Link to="/locations" className="text-sm font-medium hover:text-orange-600 transition-colors">
            Locations
          </Link>
          <Link to="/popularpizza-offers" className="text-sm font-medium hover:text-orange-600 transition-colors">
            Offers
          </Link>
          <Link to="/popularpizza-coupons" className="text-sm font-medium hover:text-orange-600 transition-colors">
            Coupons
          </Link>
          {canAccessAdmin && (
            <Link to="/admin" className="text-sm font-medium hover:text-orange-600 transition-colors">
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-semibold">
                  {user.name}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">My Orders</Link>
                </DropdownMenuItem>
                {canAccessAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm">
                Login
              </Button>
            </Link>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] px-5 sm:px-6">
              <nav className="flex flex-col space-y-4 mt-8">
                <SheetClose asChild>
                  <Link
                    to="/"
                    className="text-lg font-medium hover:text-orange-600 transition-colors py-2"
                  >
                    Home
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/popularpizza-menu"
                    className="text-lg font-medium hover:text-orange-600 transition-colors py-2"
                  >
                    Menu
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/locations"
                    className="text-lg font-medium hover:text-orange-600 transition-colors py-2"
                  >
                    Locations
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/popularpizza-offers"
                    className="text-lg font-medium hover:text-orange-600 transition-colors py-2"
                  >
                    Offers
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/popularpizza-coupons"
                    className="text-lg font-medium hover:text-orange-600 transition-colors py-2"
                  >
                    Coupons
                  </Link>
                </SheetClose>

                {user && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="text-sm font-semibold text-gray-500 mb-2">
                        Account
                      </div>
                      <SheetClose asChild>
                        <Link
                          to="/dashboard"
                          className="text-lg font-medium hover:text-orange-600 transition-colors py-2 block"
                        >
                          My Orders
                        </Link>
                      </SheetClose>
                      {canAccessAdmin && (
                        <SheetClose asChild>
                          <Link
                            to="/admin"
                            className="text-lg font-medium hover:text-orange-600 transition-colors py-2 block"
                          >
                            Admin Panel
                          </Link>
                        </SheetClose>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </>
                )}

                {!user && (
                  <div className="border-t pt-4 mt-4">
                    <SheetClose asChild>
                      <Link to="/login" className="block">
                        <Button variant="default" className="w-full">
                          Login
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <SheetClose asChild>
                    <Link to="/cart" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Cart ({cartItemsCount} items)
                      </Button>
                    </Link>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}