import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, Zap, Crown, Check, Loader2 } from 'lucide-react';
import { monetizationService, Product, PRODUCTS, PurchaseResult } from '../services/MonetizationService';
import { soundManager } from '../utils/soundManager';

interface ShopModalProps {
    onClose: () => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ onClose }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const items = await monetizationService.getProducts();
            setProducts(items);
        } catch (e) {
            console.error('Failed to load products', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (product: Product) => {
        if (purchasingId) return;

        setPurchasingId(product.id);
        try {
            const result = await monetizationService.purchaseProduct(product.id);
            if (result.success) {
                soundManager.playPowerUp();
                // Force refresh or just UI update
            }
        } catch (e) {
            console.error('Purchase failed', e);
        } finally {
            setPurchasingId(null);
        }
    };

    const isPurchased = (productId: string) => {
        if (productId === PRODUCTS.REMOVE_ADS && monetizationService.isAdsRemoved()) return true;
        return false;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2 text-yellow-500">
                        <ShoppingBag size={24} />
                        <h2 className="text-xl font-black tracking-tight text-white">MARKET</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-slate-500" size={32} />
                        </div>
                    ) : (
                        products.map(product => {
                            const purchased = isPurchased(product.id);
                            const isBuying = purchasingId === product.id;

                            return (
                                <div key={product.id} className={`relative group p-4 rounded-xl border transition-all ${purchased ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-lg ${product.id === PRODUCTS.REMOVE_ADS ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {product.id === PRODUCTS.REMOVE_ADS ? <Crown size={20} /> : <Zap size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white leading-tight">{product.title}</h3>
                                                <p className="text-xs text-slate-400">{product.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={purchased || isBuying}
                                        onClick={() => handlePurchase(product)}
                                        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${purchased
                                                ? 'bg-green-500 text-white cursor-default'
                                                : 'bg-white text-black hover:bg-slate-200 active:scale-95'
                                            }`}
                                    >
                                        {isBuying ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : purchased ? (
                                            <>
                                                <Check size={16} strokeWidth={3} />
                                                SATIN ALINDI
                                            </>
                                        ) : (
                                            <>{product.price}</>
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-500">
                    Satın alımlarınız güvenli ödeme sistemi ile korunmaktadır.
                </div>
            </div>
        </div>
    );
};

export default ShopModal;
