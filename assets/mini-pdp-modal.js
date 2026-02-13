/**
 * Mini PDP Modal JavaScript
 * Handles product data loading, modal interactions, and cart functionality
 */

class MiniPDPModal {
  constructor() {
    this.modal = document.getElementById('mini-pdp-modal');
    this.shareModal = document.getElementById('mini-pdp-share-modal');
    this.isOpen = false;
    this.currentProduct = null;
    this.currentVariant = null;
    this.currentImageIndex = 0;

    if (this.modal && this.shareModal) {
      this.init();
    }
  }

  init() {
    this.bindEvents();
    this.setupGlobalTriggers();
  }

  bindEvents() {
    // Modal close events
    const closeButtons = this.modal.querySelectorAll('[data-mini-pdp-close]');
    closeButtons.forEach((button) => {
      button.addEventListener('click', this.closeModal.bind(this));
    });

    // Share modal events
    const shareButton = this.modal.querySelector('[data-mini-pdp-share]');
    if (shareButton) {
      shareButton.addEventListener('click', this.openShareModal.bind(this));
    }

    const shareCloseButtons =
      this.shareModal.querySelectorAll('[data-share-close]');
    shareCloseButtons.forEach((button) => {
      button.addEventListener('click', this.closeShareModal.bind(this));
    });

    // External link button
    const externalButton = this.modal.querySelector('[data-mini-pdp-external]');
    if (externalButton) {
      externalButton.addEventListener('click', this.openFullProduct.bind(this));
    }

    // Add to cart button
    const atcButton = this.modal.querySelector('[data-mini-pdp-add-to-cart]');
    if (atcButton) {
      atcButton.addEventListener('click', this.handleAddToCart.bind(this));
    }

    // Size chart button
    const sizeChartButton = this.modal.querySelector(
      '[data-mini-pdp-size-chart]',
    );
    if (sizeChartButton) {
      sizeChartButton.addEventListener(
        'click',
        this.handleSizeChart.bind(this),
      );
    }

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });

    // Share option events
    const shareOptions = this.shareModal.querySelectorAll(
      '[data-share-platform]',
    );
    shareOptions.forEach((option) => {
      option.addEventListener('click', this.handleShare.bind(this));
    });
  }

  setupGlobalTriggers() {
    // Listen for global mini-pdp trigger events
    document.addEventListener('minipdp:open', (event) => {
      const { productHandle, productId, productData } = event.detail;
      if (productData) {
        this.openModal(productData);
      } else if (productHandle) {
        this.fetchAndOpenProduct(productHandle);
      } else if (productId) {
        this.fetchProductById(productId);
      }
    });
  }

  async fetchAndOpenProduct(productHandle) {
    try {
      const response = await fetch(`/products/${productHandle}.js`);
      if (!response.ok) throw new Error('Product not found');

      const productData = await response.json();
      this.openModal(productData);
    } catch (error) {
      console.error('Error fetching product:', error);
      this.showError('Product could not be loaded');
    }
  }

  async fetchProductById(productId) {
    try {
      // Use Shopify Admin API or storefront API to fetch product by ID
      // For now, we'll use the handle-based approach
      console.error(
        'fetchProductById not implemented - use productHandle instead',
      );
    } catch (error) {
      console.error('Error fetching product by ID:', error);
    }
  }

  openModal(productData) {
    this.currentProduct = productData;
    this.currentVariant =
      productData.variants && productData.variants.length > 0
        ? productData.variants[0]
        : null;
    this.currentImageIndex = 0;

    this.populateModal();
    this.showModal();
    this.isOpen = true;

    // Dispatch event for analytics
    this.dispatchEvent('minipdp:modal:open', {
      product: this.currentProduct,
    });
  }

  populateModal() {
    if (!this.currentProduct) return;

    this.populateImages();
    this.populateProductDetails();
    this.populateVariants();
    this.updateAddToCartButton();
  }

  populateImages() {
    const mainImageContainer = this.modal.querySelector(
      '.mini-pdp-image-container',
    );
    const badgesContainer = this.modal.querySelector('.mini-pdp-badges');
    const thumbnailsContainer = this.modal.querySelector(
      '.mini-pdp-thumbnails',
    );

    if (!mainImageContainer || !thumbnailsContainer) return;

    const images = this.currentProduct.images || [];

    if (images.length === 0) {
      mainImageContainer.innerHTML =
        '<div class="mini-pdp-no-image">No image available</div>';
      thumbnailsContainer.innerHTML = '';
      return;
    }

    // Main image
    const mainImage = images[this.currentImageIndex] || images[0];
    mainImageContainer.innerHTML = `
      <img src="${mainImage}" alt="${this.currentProduct.title}" loading="lazy">
    `;

    // Badges
    const badges = this.getProductBadges();
    badgesContainer.innerHTML = badges
      .map((badge) => `<span class="mini-pdp-badge">${badge}</span>`)
      .join('');

    // Thumbnails
    if (images.length > 1) {
      thumbnailsContainer.innerHTML = images
        .map(
          (image, index) => `
        <div class="mini-pdp-thumbnail ${index === this.currentImageIndex ? 'active' : ''}"
             data-image-index="${index}">
          <img src="${image}" alt="${this.currentProduct.title}" loading="lazy">
        </div>
      `,
        )
        .join('');

      // Bind thumbnail events
      const thumbnails = thumbnailsContainer.querySelectorAll(
        '.mini-pdp-thumbnail',
      );
      thumbnails.forEach((thumbnail) => {
        thumbnail.addEventListener('click', (e) => {
          const imageIndex = parseInt(thumbnail.dataset.imageIndex);
          this.switchImage(imageIndex);
        });
      });
    } else {
      thumbnailsContainer.innerHTML = '';
    }
  }

  populateProductDetails() {
    const titleElement = this.modal.querySelector('.mini-pdp-title');
    const priceContainer = this.modal.querySelector('.mini-pdp-price');
    const measurementsContainer = this.modal.querySelector(
      '.mini-pdp-measurements',
    );
    const stockContainer = this.modal.querySelector('.mini-pdp-stock');

    if (titleElement) {
      titleElement.textContent = this.currentProduct.title;
    }

    // Price
    if (priceContainer && this.currentVariant) {
      const price = this.formatPrice(this.currentVariant.price);
      const compareAtPrice = this.currentVariant.compare_at_price
        ? this.formatPrice(this.currentVariant.compare_at_price)
        : null;
      const discount = compareAtPrice
        ? this.calculateDiscount(
            this.currentVariant.compare_at_price,
            this.currentVariant.price,
          )
        : null;

      let priceHTML = `<span class="current-price">${price}</span>`;

      if (compareAtPrice) {
        priceHTML += `<span class="compare-price">${compareAtPrice}</span>`;
      }

      if (discount) {
        priceHTML += `<span class="discount">${discount}% OFF</span>`;
      }

      priceContainer.innerHTML = priceHTML;
    }

    // Product measurements
    if (measurementsContainer) {
      const measurements = this.getProductMeasurements();
      if (measurements) {
        measurementsContainer.innerHTML = measurements;
      }
    }

    // Stock status
    if (stockContainer && this.currentVariant) {
      const stockInfo = this.getStockInfo();
      stockContainer.innerHTML = stockInfo.html;
      stockContainer.className = `mini-pdp-stock ${stockInfo.class}`;
    }
  }

  populateVariants() {
    const variantsContainer = this.modal.querySelector(
      '.mini-pdp-variant-options',
    );
    if (!variantsContainer || !this.currentProduct.variants) return;

    // Group variants by option (assuming size is the main option)
    const sizeOption = this.currentProduct.options
      ? this.currentProduct.options[0]
      : null;
    if (!sizeOption || sizeOption.name.toLowerCase() !== 'size') {
      variantsContainer.innerHTML = '';
      return;
    }

    const variants = this.currentProduct.variants;
    const variantHTML = variants
      .map((variant) => {
        const size = variant.options[0]; // Assuming first option is size
        const isSelected =
          variant.id === (this.currentVariant ? this.currentVariant.id : null);
        const isAvailable = variant.available;

        return `
        <button class="mini-pdp-variant-option ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}"
                data-variant-id="${variant.id}"
                ${!isAvailable ? 'disabled' : ''}>
          ${size}
        </button>
      `;
      })
      .join('');

    variantsContainer.innerHTML = variantHTML;

    // Bind variant selection events
    const variantButtons = variantsContainer.querySelectorAll(
      '.mini-pdp-variant-option',
    );
    variantButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const variantId = parseInt(button.dataset.variantId);
        this.selectVariant(variantId);
      });
    });
  }

  selectVariant(variantId) {
    const variant = this.currentProduct.variants.find(
      (v) => v.id === variantId,
    );
    if (!variant) return;

    this.currentVariant = variant;

    // Update UI
    this.updateVariantSelection();
    this.populateProductDetails();
    this.updateAddToCartButton();

    // Dispatch event
    this.dispatchEvent('minipdp:variant:change', {
      variant: this.currentVariant,
      product: this.currentProduct,
    });
  }

  updateVariantSelection() {
    const variantButtons = this.modal.querySelectorAll(
      '.mini-pdp-variant-option',
    );
    variantButtons.forEach((button) => {
      const variantId = parseInt(button.dataset.variantId);
      button.classList.toggle('selected', variantId === this.currentVariant.id);
    });
  }

  updateAddToCartButton() {
    const atcButton = this.modal.querySelector('.mini-pdp-atc-button');
    if (!atcButton || !this.currentVariant) return;

    const isAvailable = this.currentVariant.available;

    atcButton.disabled = !isAvailable;

    const textElement = atcButton.querySelector('.mini-pdp-atc-text');
    if (textElement) {
      textElement.textContent = isAvailable ? 'ADD TO BAG' : 'SOLD OUT';
    }
  }

  switchImage(imageIndex) {
    this.currentImageIndex = imageIndex;
    this.populateImages();
  }

  showModal() {
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.isOpen = false;

    this.dispatchEvent('minipdp:modal:close', {
      product: this.currentProduct,
    });
  }

  openShareModal() {
    this.shareModal.setAttribute('aria-hidden', 'false');
  }

  closeShareModal() {
    this.shareModal.setAttribute('aria-hidden', 'true');
  }

  openFullProduct() {
    if (this.currentProduct && this.currentProduct.handle) {
      window.open(`/products/${this.currentProduct.handle}`, '_blank');
    }
  }

  async handleAddToCart() {
    if (!this.currentVariant || !this.currentVariant.available) return;

    const atcButton = this.modal.querySelector('.mini-pdp-atc-button');
    if (!atcButton) return;

    // Show loading state
    atcButton.classList.add('loading');
    atcButton.disabled = true;

    try {
      const formData = {
        id: this.currentVariant.id,
        quantity: 1,
      };

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      const result = await response.json();

      // Success handling
      this.handleAddToCartSuccess(result);

      // Dispatch success event
      this.dispatchEvent('minipdp:cart:add:success', {
        variant: this.currentVariant,
        product: this.currentProduct,
        cartData: result,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.handleAddToCartError(error);

      this.dispatchEvent('minipdp:cart:add:error', {
        error: error.message,
        variant: this.currentVariant,
        product: this.currentProduct,
      });
    } finally {
      // Remove loading state
      atcButton.classList.remove('loading');
      atcButton.disabled = !this.currentVariant.available;
    }
  }

  handleAddToCartSuccess(cartData) {
    // Update button text temporarily
    const textElement = this.modal.querySelector('.mini-pdp-atc-text');
    if (textElement) {
      const originalText = textElement.textContent;
      textElement.textContent = 'ADDED TO BAG';

      setTimeout(() => {
        textElement.textContent = originalText;
      }, 2000);
    }

    // Update cart count if cart drawer/icon exists
    this.updateCartCount();
  }

  handleAddToCartError(error) {
    // Show error message (could implement toast notification)
    console.error('Add to cart failed:', error);
  }

  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      // Update cart count in header/drawer if exists
      const cartCountElements = document.querySelectorAll('[data-cart-count]');
      cartCountElements.forEach((element) => {
        element.textContent = cart.item_count;
      });

      // Dispatch cart update event
      document.dispatchEvent(
        new CustomEvent('cart:updated', {
          detail: { cart },
        }),
      );
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  handleShare(e) {
    const platform = e.currentTarget.dataset.sharePlatform;
    const productUrl = `${window.location.origin}/products/${this.currentProduct.handle}`;
    const productTitle = this.currentProduct.title;

    switch (platform) {
      case 'facebook':
        this.shareOnFacebook(productUrl, productTitle);
        break;
      case 'twitter':
        this.shareOnTwitter(productUrl, productTitle);
        break;
      case 'whatsapp':
        this.shareOnWhatsApp(productUrl, productTitle);
        break;
      case 'copy':
        this.copyToClipboard(productUrl);
        break;
    }

    this.closeShareModal();
  }

  shareOnFacebook(url, title) {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  shareOnTwitter(url, title) {
    const text = `Check out ${title}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  shareOnWhatsApp(url, title) {
    const text = `Check out ${title}: ${url}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      // Could show success message
      console.log('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  handleSizeChart() {
    // Size chart functionality - for future implementation
    console.log('Size chart clicked');
  }

  // Utility methods
  getProductBadges() {
    const badges = [];

    if (this.currentProduct.tags && this.currentProduct.tags.includes('new')) {
      badges.push('NEW ARRIVAL');
    }

    if (
      this.currentVariant &&
      this.currentVariant.compare_at_price > this.currentVariant.price
    ) {
      badges.push('SALE');
    }

    return badges;
  }

  getProductMeasurements() {
    // This would typically come from metafields
    // For now, return a sample measurement
    return `SHOULDER:15.00 | BUST:33.75 | WAIST:33.75 | BODY LENGTH:27.75`;
  }

  getStockInfo() {
    if (!this.currentVariant) {
      return { html: '', class: '' };
    }

    if (!this.currentVariant.available) {
      return {
        html: `
          <svg class="mini-pdp-stock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span class="mini-pdp-stock-text">Out of stock</span>
        `,
        class: 'out-of-stock',
      };
    }

    // Check inventory quantity if available
    const inventory = this.currentVariant.inventory_quantity || 0;

    if (inventory > 0 && inventory <= 5) {
      return {
        html: `
          <svg class="mini-pdp-stock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M1 21H23L12 2L1 21Z"/>
            <path d="M12 9V13"/>
            <circle cx="12" cy="17" r="1"/>
          </svg>
          <span class="mini-pdp-stock-text">Low in stock - Only ${inventory} available</span>
        `,
        class: 'low-stock',
      };
    }

    return {
      html: `
        <svg class="mini-pdp-stock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12A10 10 0 1 1 5.93 7.5"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
        <span class="mini-pdp-stock-text">In stock</span>
      `,
      class: 'in-stock',
    };
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  }

  calculateDiscount(originalPrice, salePrice) {
    return Math.round((1 - salePrice / originalPrice) * 100);
  }

  showError(message) {
    console.error('Mini PDP Error:', message);
    // Could implement toast notification here
  }

  dispatchEvent(eventName, detail = {}) {
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // Public API
  open(productData) {
    this.openModal(productData);
  }

  close() {
    this.closeModal();
  }

  openByHandle(productHandle) {
    this.fetchAndOpenProduct(productHandle);
  }
}

// Initialize when DOM is ready
function initMiniPDPModal() {
  window.miniPDPModal = new MiniPDPModal();
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMiniPDPModal);
} else {
  initMiniPDPModal();
}

// Re-initialize when section is loaded (theme editor)
document.addEventListener('shopify:section:load', (event) => {
  if (event.target.querySelector('#mini-pdp-modal')) {
    setTimeout(initMiniPDPModal, 100);
  }
});

// Global helper function to trigger mini-PDP
window.openMiniPDP = function (productHandle, productData = null) {
  if (window.miniPDPModal) {
    if (productData) {
      window.miniPDPModal.open(productData);
    } else {
      window.miniPDPModal.openByHandle(productHandle);
    }
  } else {
    // Fallback: dispatch event
    document.dispatchEvent(
      new CustomEvent('minipdp:open', {
        detail: { productHandle, productData },
      }),
    );
  }
};
