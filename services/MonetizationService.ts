import { Capacitor } from '@capacitor/core';
import { executeStatement, executeQuery } from './database/DatabaseManager';

// Types for Monetization
export enum AdType {
    INTERSTITIAL = 'INTERSTITIAL',
    REWARDED = 'REWARDED',
    BANNER = 'BANNER'
}

export interface Product {
    id: string;
    title: string;
    description: string;
    price: string;
    priceAmount: number;
    currency: string;
    type: 'CONSUMABLE' | 'NON_CONSUMABLE' | 'SUBSCRIPTION';
}

export interface PurchaseResult {
    success: boolean;
    message?: string;
    productId?: string;
}

// Product Constants
export const PRODUCTS = {
    REMOVE_ADS: 'com.karubsg.tabulaxy.remove_ads',
    PREMIUM_WORDS: 'com.karubsg.tabulaxy.premium_words',
    JOKER_PACK_SMALL: 'com.karubsg.tabulaxy.joker_pack_small',
    MAP_SPEED_BOOST: 'com.karubsg.tabulaxy.map_speed_boost'
};

class MonetizationService {
    private isInitialized = false;
    private isPremium = false; // Ads removed?
    private hasPremiumWords = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Check database for purchased features
        await this.restorePurchases();

        if (Capacitor.isNativePlatform()) {
            await this.initNativeAds();
            await this.initNativeIAP();
        } else {
            console.log('[Monetization] Initialized in Web/Mock mode');
        }

        this.isInitialized = true;
    }

    // --- ADS ---

    async showInterstitial(): Promise<void> {
        if (this.isPremium) {
            console.log('[Ads] Interstitial skipped (Premium User)');
            return;
        }

        if (Capacitor.isNativePlatform()) {
            // TODO: Implement AdMob Interstitial
            console.log('[Ads] Native Interstitial showing...');
            return new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log('[Ads] Web Mock Interstitial showing...');
            return new Promise(resolve => {
                // Find or create overlay
                const overlay = this.createMockAdOverlay('Reklam (5s)');
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 3000); // 3 sn bekle
            });
        }
    }

    async showRewarded(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            // TODO: Implement AdMob Rewarded
            console.log('[Ads] Native Rewarded showing...');
            return true;
        } else {
            console.log('[Ads] Web Mock Rewarded showing...');
            return new Promise(resolve => {
                const overlay = this.createMockAdOverlay('Ödüllü Reklam (İzle Kazan)');
                const btn = document.createElement('button');
                btn.innerText = "Ödülü Al";
                btn.style.cssText = "margin-top: 20px; padding: 10px 20px; background: #4ECDC4; border: none; border-radius: 8px; font-weight: bold; font-family: inherit;";
                btn.onclick = () => {
                    overlay.remove();
                    resolve(true);
                };
                overlay.querySelector('.ad-content')?.appendChild(btn);

                // Close button (failure)
                const close = document.createElement('button');
                close.innerText = "Kapat (Ödül Yok)";
                close.style.cssText = "margin-top: 10px; display: block; color: white; background: none; border: none; text-decoration: underline; cursor: pointer;";
                close.onclick = () => {
                    overlay.remove();
                    resolve(false);
                };
                overlay.querySelector('.ad-content')?.appendChild(close);
            });
        }
    }

    // --- IAP ---

    async getProducts(): Promise<Product[]> {
        return [
            {
                id: PRODUCTS.REMOVE_ADS,
                title: 'Reklamları Kaldır',
                description: 'Kesintisiz oyun keyfi',
                price: '19.99 ₺',
                priceAmount: 19.99,
                currency: 'TRY',
                type: 'NON_CONSUMABLE'
            },
            {
                id: PRODUCTS.PREMIUM_WORDS,
                title: 'Premium Kelime Paketi',
                description: '+10,000 yeni özel kelime',
                price: '19.99 ₺',
                priceAmount: 19.99,
                currency: 'TRY',
                type: 'NON_CONSUMABLE'
            },
            {
                id: PRODUCTS.JOKER_PACK_SMALL,
                title: 'Joker Paketi',
                description: 'Her jokerden 10 adet',
                price: '19.99 ₺',
                priceAmount: 19.99,
                currency: 'TRY',
                type: 'CONSUMABLE'
            }
        ];
    }

    async purchaseProduct(productId: string): Promise<PurchaseResult> {
        console.log(`[IAP] Purchasing ${productId}...`);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Grant purchase logic
        if (productId === PRODUCTS.REMOVE_ADS) {
            this.isPremium = true;
            this.saveSetting('ads_removed', 'true');
        } else if (productId === PRODUCTS.PREMIUM_WORDS) {
            this.hasPremiumWords = true;
            this.saveSetting('premium_words', 'true');
            // TODO: Enable words in DB
        } else if (productId === PRODUCTS.JOKER_PACK_SMALL) {
            // Add jokers to user session/db is tricky if session is transient
            // We might need a persistent joker stash in DB
        }

        // Record purchase in DB
        executeStatement(
            'INSERT INTO purchases (product_id) VALUES (?)',
            [productId]
        );

        return { success: true, productId, message: 'Satın alma başarılı!' };
    }

    async restorePurchases(): Promise<void> {
        try {
            // Check settings table
            const adsRemoved = await this.getSetting('ads_removed');
            if (adsRemoved === 'true') this.isPremium = true;

            const premiumWords = await this.getSetting('premium_words');
            if (premiumWords === 'true') this.hasPremiumWords = true;

            console.log(`[Monetization] Restored. Premium: ${this.isPremium}, Premium Words: ${this.hasPremiumWords}`);
        } catch (e) {
            console.warn('[Monetization] Failed to restore purchases', e);
        }
    }

    isAdsRemoved(): boolean {
        return this.isPremium;
    }

    private async initNativeAds() {
        // TODO: AdMob init code here
    }

    private async initNativeIAP() {
        // TODO: IAP init code here
    }

    // --- HELPERS ---

    private getSetting(key: string): string | null {
        const res = executeQuery<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
        return res[0]?.value || null;
    }

    private saveSetting(key: string, value: string) {
        executeStatement('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }

    private createMockAdOverlay(title: string): HTMLElement {
        const div = document.createElement('div');
        div.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: white; font-family: sans-serif;
    `;
        div.innerHTML = `
      <div class="ad-content" style="background: #222; padding: 30px; border-radius: 12px; text-align: center; max-width: 80%;">
        <h2 style="margin:0 0 10px 0; color: #ffeb3b;">REKLAM MODU</h2>
        <h1 style="margin:0 0 20px 0;">${title}</h1>
        <div style="width: 50px; height: 50px; border: 4px solid #fff; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      </div>
    `;
        document.body.appendChild(div);
        return div;
    }
}

export const monetizationService = new MonetizationService();
