/**
 * Shop by Look Section JavaScript
 * Handles hotspot interactions, variant selection, and bulk add-to-cart
 */

/* ====================================
   Hotspot Handler Class
   ==================================== */

class ShopByLookHotspots {
  constructor(container) {
    this.container = container;
    this.hotspots = container.querySelectorAll(".shop-by-look__hotspot");
    this.productItems = container.querySelectorAll(
      ".shop-by-look__product-item",
    );
    this.productList = container.querySelector(".shop-by-look__product-list");
  }

  init() {
    if (!this.hotspots.length || !this.productItems.length) return;

    this.hotspots.forEach((hotspot) => {
      hotspot.addEventListener("click", this.handleHotspotClick.bind(this));
    });
  }

  handleHotspotClick(event) {
    const index = parseInt(event.currentTarget.dataset.productIndex);
    const targetCard = this.productItems[index];

    if (!targetCard || !this.productList) return;

    // Calculate scroll position for horizontal scrolling
    const containerRect = this.productList.getBoundingClientRect();
    const cardRect = targetCard.getBoundingClientRect();

    // Calculate the offset needed to center the card
    const scrollOffset =
      cardRect.left -
      containerRect.left -
      containerRect.width / 2 +
      cardRect.width / 2;

    // Scroll the product list container
    this.productList.scrollBy({
      left: scrollOffset,
      behavior: "smooth",
    });

    // Mark hotspot as active
    this.hotspots.forEach((h) => h.classList.remove("active"));
    event.currentTarget.classList.add("active");

    // Add highlight animation
    this.highlightCard(targetCard);
  }

  highlightCard(card) {
    // Remove existing highlights
    this.productItems.forEach((item) => item.classList.remove("highlighted"));

    // Add highlight
    card.classList.add("highlighted");

    // Remove after animation completes
    setTimeout(() => {
      card.classList.remove("highlighted");
    }, 2000);
  }
}

/* ====================================
   Variant Select Handler
   ==================================== */

function initVariantSelectors(container) {
  const selects = container.querySelectorAll("[data-variant-select]");
  selects.forEach((select) => {
    select.addEventListener("change", (event) => {
      const card = event.target.closest(".card-shop-look");
      if (card) {
        card.dataset.variantId = event.target.value;
      }
    });
  });
}

/* ====================================
   Bulk Add-to-Cart Web Component
   ==================================== */

if (!customElements.get("shop-by-look-bulk-add")) {
  customElements.define(
    "shop-by-look-bulk-add",
    class ShopByLookBulkAdd extends HTMLElement {
      constructor() {
        super();
        this.button = this.querySelector("[data-bulk-add-button]");
        this.isLoading = false;

        // Find cart element
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");

        // Bind handler for cleanup
        this.boundHandleBulkAdd = this.handleBulkAdd.bind(this);
      }

      connectedCallback() {
        if (!this.button) return;
        this.button.addEventListener("click", this.boundHandleBulkAdd);
      }

      disconnectedCallback() {
        if (this.button) {
          this.button.removeEventListener("click", this.boundHandleBulkAdd);
        }
      }

      getVariantIds() {
        // Read variant IDs from card data attributes at click time
        const section = this.closest(".shop-by-look");
        if (!section) return [];

        const cards = section.querySelectorAll(
          ".card-shop-look[data-variant-id]",
        );
        const ids = [];
        cards.forEach((card) => {
          const variantId = parseInt(card.dataset.variantId);
          if (variantId) {
            ids.push(variantId);
          }
        });
        return ids;
      }

      async handleBulkAdd() {
        // Prevent double-clicks
        if (
          this.isLoading ||
          this.button.getAttribute("aria-disabled") === "true"
        )
          return;

        const variantIds = this.getVariantIds();

        if (!variantIds.length) return;

        this.isLoading = true;
        this.setLoadingState(true);

        try {
          // Build items array for single bulk request
          const items = variantIds.map((id) => ({ id, quantity: 1 }));

          const body = { items };

          // Add sections for cart update
          if (this.cart) {
            const sections = this.cart.getSectionsToRender
              ? this.cart.getSectionsToRender().map((s) => s.id)
              : this.getSectionsToRender().map((s) => s.id);

            body.sections = sections;
            body.sections_url = window.location.pathname;
          }

          const response = await fetch(`${window.routes.cart_add_url}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/javascript",
            },
            body: JSON.stringify(body),
          });

          const data = await response.json();

          if (data.status === 422 || data.errors) {
            throw new Error(
              data.description || data.message || "Failed to add products",
            );
          }

          // Publish cart update event
          // if (typeof window.PUB_SUB_EVENTS !== 'undefined' && typeof window.publish === 'function') {
          //   window.publish(window.PUB_SUB_EVENTS.cartUpdate, {
          //     source: 'shop-by-look-bulk-add',
          //     count: variantIds.length,
          //   });
          // }

          // Update cart UI
          if (this.cart && data) {
            this.cart.renderContents(data);
          }
        } catch (error) {
          console.error("Bulk add error:", error);
        } finally {
          this.isLoading = false;
          this.setLoadingState(false);
        }
      }

      setLoadingState(loading) {
        if (!this.button) return;

        const spinner = this.button.querySelector(".loading-overlay__spinner");

        if (loading) {
          this.button.setAttribute("aria-disabled", "true");
          this.button.classList.add("loading");
          if (spinner) spinner.classList.remove("hidden");
        } else {
          this.button.removeAttribute("aria-disabled");
          this.button.classList.remove("loading");
          if (spinner) spinner.classList.add("hidden");
        }
      }

      getSectionsToRender() {
        return [
          {
            id: "cart-drawer",
            section: "cart-drawer",
            selector: ".drawer__inner",
          },
          {
            id: "cart-icon-bubble",
            section: "cart-icon-bubble",
            selector: ".shopify-section",
          },
        ];
      }
    },
  );
}

/* ====================================
   Initialize on DOM Ready
   ==================================== */

function initShopByLook() {
  document.querySelectorAll(".shop-by-look").forEach((section) => {
    const hotspotHandler = new ShopByLookHotspots(section);
    hotspotHandler.init();
    initVariantSelectors(section);
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShopByLook);
} else {
  initShopByLook();
}

// Re-initialize when sections are loaded via theme editor
document.addEventListener("shopify:section:load", (event) => {
  if (event.target.querySelector(".shop-by-look")) {
    initShopByLook();
  }
});
