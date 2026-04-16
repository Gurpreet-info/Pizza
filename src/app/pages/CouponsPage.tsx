import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Copy, Check, Tag, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '../hooks/usePageMeta';
import { HomePageBanner } from '../components/HomePageBanner';

export function CouponsPage() {
  usePageMeta(
    'Coupons',
    'Browse active Pizza Offers coupon codes — copy at checkout and save on eligible orders.'
  );

  const { coupons, ensureCouponsPageLoaded } = useApp();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    void ensureCouponsPageLoaded();
  }, []);

  const activeCoupons = coupons.filter(c => {
    const now = new Date();
    return c.active && 
           new Date(c.validUntil) >= now && 
           new Date(c.validFrom) <= now &&
           c.usageCount < c.usageLimit;
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDiscountText = (coupon: typeof activeCoupons[0]) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% OFF`;
    } else {
      return `$${coupon.discountValue.toFixed(2)} OFF`;
    }
  };

  return (
    <div>
      <HomePageBanner
        title="Coupons & Savings"
        subtitle="Find active coupon codes and apply them at checkout to save on your next order."
      />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Tag className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Available Coupons</h1>
            <p className="text-gray-600 text-lg">
              Save big on your next order! Copy a coupon code and apply it at checkout.
            </p>
          </div>

          {/* Coupons Grid */}
          {activeCoupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No active coupons available</h3>
                <p className="text-gray-500">Check back later for new deals!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeCoupons.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                const remainingUses = coupon.usageLimit - coupon.usageCount;
                const usagePercentage = (coupon.usageCount / coupon.usageLimit) * 100;

                return (
                  <Card 
                    key={coupon.id} 
                    className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 hover:border-orange-200"
                  >
                    {/* Discount Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-orange-600 text-white px-3 py-1 text-lg font-bold">
                        {getDiscountText(coupon)}
                      </Badge>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-2xl pr-24">{coupon.description}</CardTitle>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span>Minimum order: ${coupon.minOrderAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Valid until {formatDate(coupon.validUntil)}</span>
                        </div>
                        {coupon.maxDiscount && coupon.discountType === 'percentage' && (
                          <div className="text-sm text-gray-500">
                            Max discount: ${coupon.maxDiscount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Coupon Code */}
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500 uppercase mb-1">Coupon Code</div>
                            <div className="text-2xl font-mono font-bold text-orange-600">
                              {coupon.code}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(coupon.code)}
                            className="gap-2"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Usage Stats */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Remaining uses:</span>
                          <span className="font-semibold">
                            {remainingUses} of {coupon.usageLimit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all"
                            style={{ width: `${usagePercentage}%` }}
                          />
                        </div>
                        {remainingUses <= 10 && (
                          <p className="text-xs text-orange-600 font-medium">
                            Limited availability - use it soon!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* How to Use Section */}
          <Card className="mt-12 bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle>How to Use Coupons</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Click the "Copy" button next to your chosen coupon code</li>
                <li>Add items to your cart and proceed to checkout</li>
                <li>Paste the coupon code in the "Coupon Code" field</li>
                <li>Click "Apply" to see your discount</li>
                <li>Complete your order and enjoy your savings!</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}