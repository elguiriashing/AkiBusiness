package com.akipasa.business;

import org.junit.Test;
import static org.junit.Assert.*;

public class AppAuthCallbackTest {
    @Test public void mapsOnlyToOwnFixedOriginWithNativeMarkers() {
        String result = AppAuthCallback.toWebUrl("akibusiness://auth/callback?locale=en&code=one%2Btwo&next=%2Fen%2Faccount");
        assertEquals("https://akibusiness.com/login?android=1&native=1&code=one%2Btwo&next=%2Fen%2Faccount", result);
        assertTrue(AppAuthCallback.toWebUrl("akibusiness://auth/callback?code=abc").startsWith("https://akibusiness.com/login?android=1&native=1"));
    }
    @Test public void cancellationReturnsToOwnWebCallback() {
        assertTrue(AppAuthCallback.toWebUrl("akibusiness://auth/callback?locale=es&error=access_denied&error_description=Cancelled%20by%20user").contains("error=access_denied&error_description=Cancelled+by+user"));
    }
    @Test public void rejectsCrossAppAndAmbiguousOrTokenCallbacks() {
        for (String value : new String[]{
            "otherapp://auth/callback?code=abc", "akibusiness://evil/callback?code=abc",
            "akibusiness://auth/callback/extra?code=abc", "akibusiness://user@auth/callback?code=abc",
            "akibusiness://auth:443/callback?code=abc", "akibusiness://auth/callback?code=abc#access_token=secret",
            "akibusiness://auth/callback?code=abc&code=second", "akibusiness://auth/callback?code=abc&access_token=secret",
            "akibusiness://auth/callback?code=abc&redirect=https%3A%2F%2Fevil.example", "akibusiness://auth/callback?locale=en",
            "akibusiness://auth/callback?code=", "akibusiness://auth/callback?code=%ZZ", "akibusiness://auth/%63allback?code=abc"}) assertNull(value, AppAuthCallback.toWebUrl(value));
        assertNull(AppAuthCallback.toWebUrl(null));
        assertNull(AppAuthCallback.toWebUrl("akibusiness://auth/callback?code=" + "x".repeat(9000)));
    }
}
