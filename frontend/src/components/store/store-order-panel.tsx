"use client";

import { useEffect, useState } from "react";
import Cart from "@/components/store/cart";
import { useCartContext } from "@/components/context/store-context";
import { useStoreData } from "@/hooks/store/use-storefront";
import { withStoreDefaults } from "@/lib/layout-theme-defaults";
import { signIn, useSession } from "@/lib/laravel-auth-react";
import { getAuthToken } from "@/lib/laravel-auth";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { HomeCardCorners } from "@/components/home/home-card-corners";
import { ThemeSelect } from "@/components/theme-select";

export default function StoreOrderPanel({ theme }: { theme?: Record<string, unknown> }) {
  const t = withStoreDefaults(theme);
  const {
    cart,
    purchaseType,
    setPurchaseType,
    selectedPackage,
    setCartItem,
    sidebarView,
    setSidebarView,
  } = useCartContext();
  const { data: store } = useStoreData();
  const { status, data: session } = useSession();
  const { data: storeSettings } = useStoreSettings();
  const [serverId, setServerId] = useState("");
  const [adding, setAdding] = useState(false);

  const currency = (store?.currency as string | undefined) || "USD";
  const needsServer = !!(
    selectedPackage?.single_game_server_only && (selectedPackage.gameservers?.length ?? 0) > 0
  );
  const supportsBoth = !!(selectedPackage?.allow_one_time_purchase && selectedPackage?.allow_subscription);
  const onlySubscription = !!(selectedPackage?.allow_subscription && !selectedPackage?.allow_one_time_purchase);
  const onlyOneTime = !!(selectedPackage?.allow_one_time_purchase && !selectedPackage?.allow_subscription);
  const showPurchaseToggle = !selectedPackage || supportsBoth || (!onlySubscription && !onlyOneTime);
  const selectedName = selectedPackage?.name || "Select a package";
  const selectedPrice = selectedPackage ? (selectedPackage.price / 100).toFixed(2) : "0.00";
  const cartCount = cart?.lines?.length ?? 0;

  useEffect(() => {
    setServerId("");
  }, [selectedPackage?.id]);

  const handleAdd = () => {
    if (!selectedPackage) {
      toast.error("Select a package first.");
      return;
    }
    if (status === "loading") return;
    if (status === "unauthenticated") return signIn("steam");
    if (!getAuthToken()) {
      toast.error("Sign in to add to cart.");
      signIn("steam");
      return;
    }
    if (storeSettings?.requireLinkedToPurchase) {
      const hasLinked = !!(
        session?.user &&
        ((session.user as Record<string, unknown>).discordId ??
          (session.user as Record<string, unknown>).steamId)
      );
      if (!hasLinked) {
        toast.error("Please link your Discord or Steam account in your profile to add to cart.");
        return;
      }
    }
    if (needsServer && !serverId) {
      toast.error("Please select a server.");
      return;
    }
    const isSubscription = supportsBoth
      ? purchaseType === "subscription"
      : onlySubscription || (!selectedPackage.allow_one_time_purchase && !!selectedPackage.allow_subscription);
    setAdding(true);
    setCartItem(selectedPackage.id, 1, serverId || undefined, isSubscription);
    setSidebarView("cart");
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <div
      className="relative flex w-full flex-col overflow-visible border p-5"
      style={{
        backgroundColor: t.sidebarBackground,
        borderColor: t.sidebarBorder,
        ["--store-sidebar-title" as string]: t.sidebarTitleColor,
        ["--store-sidebar-name" as string]: t.sidebarSelectedNameColor,
        ["--store-sidebar-price" as string]: t.sidebarPriceColor,
        ["--store-sidebar-text" as string]: t.sidebarTextColor,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="store-order-kicker text-[9px] font-bold tracking-[1.62px]">
          {sidebarView === "cart" ? "YOUR CART" : "YOUR ORDER"}
        </p>
        {cartCount > 0 && sidebarView === "configure" ? (
          <button
            type="button"
            className="ghost store-help-cta text-[9px] font-bold tracking-[1.2px]"
            onClick={() => setSidebarView("cart")}
          >
            VIEW CART ({cartCount})
          </button>
        ) : null}
        {sidebarView === "cart" ? (
          <button
            type="button"
            className="ghost store-order-meta text-[9px] font-bold tracking-[1.2px]"
            onClick={() => setSidebarView("configure")}
          >
            ADD ITEM
          </button>
        ) : null}
      </div>

      {sidebarView === "cart" ? (
        <div className="pt-4">
          <Cart theme={t} variant="inline" />
        </div>
      ) : (
        <>
          <div className="mt-5 border-y py-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <p className="store-order-meta text-[10px] tracking-[1.2px]">SELECTED PACKAGE</p>
            <p className="store-order-name truncate pt-1 text-[18px] font-extrabold leading-7">
              {selectedName.toUpperCase()}
            </p>
            <p className="store-order-price pt-1 text-[16px] font-bold leading-6">
              ${selectedPrice} <span className="store-order-meta text-[10px] font-medium">{currency}</span>
            </p>
          </div>

          {selectedPackage ? (
            <>
              {showPurchaseToggle ? (
                <div className="mt-4">
                  <p className="store-order-meta pb-2 text-[10px] tracking-[1.2px]">PURCHASE TYPE</p>
                  <div className="grid grid-cols-2 gap-1 p-1" style={{ backgroundColor: "#070a0e" }}>
                    <button
                      type="button"
                      className="ghost py-2 text-center text-[9px] font-bold tracking-[0.225px]"
                      style={{
                        backgroundColor: purchaseType === "one-time" ? "#1b2533" : "transparent",
                        color: purchaseType === "one-time" ? "#ffffff" : "#708195",
                      }}
                      onClick={() => setPurchaseType("one-time")}
                    >
                      One-time
                    </button>
                    <button
                      type="button"
                      className="ghost py-2 text-center text-[9px] font-bold tracking-[0.225px]"
                      style={{
                        backgroundColor: purchaseType === "subscription" ? "#1b2533" : "transparent",
                        color: purchaseType === "subscription" ? "#ffffff" : "#708195",
                      }}
                      onClick={() => setPurchaseType("subscription")}
                    >
                      Subscription
                    </button>
                  </div>
                </div>
              ) : (
                <p className="store-order-meta mt-4 text-[10px] tracking-[1.2px]">
                  {onlySubscription ? "SUBSCRIPTION" : "ONE-TIME PURCHASE"}
                </p>
              )}

              {needsServer ? (
                <div className="mt-4">
                  <p className="store-order-meta pb-2 text-[10px] tracking-[1.2px]">SERVER</p>
                  <ThemeSelect
                    value={serverId}
                    onValueChange={setServerId}
                    placeholder="Select a server…"
                    className="h-[37px] text-[11px]"
                    options={[...(selectedPackage.gameservers ?? [])]
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                      .map((server) => ({ value: server.id, label: server.name }))}
                  />
                </div>
              ) : null}

              <button
                type="button"
                className="ghost mt-4 flex h-[41px] w-full items-center justify-center border text-[10px] font-bold tracking-[1.4px]"
                style={{
                  borderColor: "rgba(186,145,66,0.6)",
                  color: t.buttonPrimaryText,
                  backgroundColor: "transparent",
                }}
                onClick={handleAdd}
                disabled={adding}
              >
                {adding ? <Loader2 className="size-4 animate-spin" /> : "ADD TO CART"}
              </button>
            </>
          ) : (
            <p className="store-order-meta pt-4 text-[11px] leading-5">
              Select a package on the left to choose purchase type and server.
            </p>
          )}
        </>
      )}
      <HomeCardCorners color="#ba9142" show />
    </div>
  );
}
