
// Using fawazahmed0/currency-api via jsDelivr
// Github: https://github.com/fawazahmed0/currency-api
// No API Key required, supports historical dates via CDN.

interface CurrencyResponse {
    date: string;
    usd: {
        ars: number;
        [key: string]: number;
    };
}

export const getHistoricalRate = async (date: string): Promise<number> => {
    try {
        // Validation: Ensure date is YYYY-MM-DD
        // URL format: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/usd.json
        
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Rate not found for date ${date}`);
        }

        const data: CurrencyResponse = await response.json();
        
        // Return the rate (e.g., 980.50)
        return data.usd.ars || 0;
    } catch (e) {
        console.warn(`Specific date (${date}) lookup failed, trying fallback to latest...`);
        
        // Fallback: If specific date fails (e.g. today's data isn't uploaded yet), try latest
        try {
             const fallbackUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`;
             const fbResponse = await fetch(fallbackUrl);
             if(fbResponse.ok) {
                 const fbData: CurrencyResponse = await fbResponse.json();
                 return fbData.usd.ars || 0;
             }
        } catch (e2) {
            console.error("Currency fallback failed", e2);
        }
        
        return 0; // Return 0 to indicate lookup failed completely
    }
};
