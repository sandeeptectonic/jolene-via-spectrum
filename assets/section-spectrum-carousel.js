// Spectrum Carousel Videos - Theme Integrated Runtime
class SpectrumCarousel {
  constructor(section) {
    this.section = section;
    this.sectionId = section.dataset.sectionId;
    this.modal = document.getElementById(`spectrum-modal-${this.sectionId}`);
    this.init();
  }

  init() {
    // Initialize carousel triggers
    this.section
      .querySelectorAll('.spectrum-carousel__trigger')
      .forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal(trigger);
        });
      });

    // Initialize navigation
    const prevBtn = this.section.querySelector('.spectrum-carousel__nav-prev');
    const nextBtn = this.section.querySelector('.spectrum-carousel__nav-next');

    if (prevBtn) prevBtn.addEventListener('click', () => this.navigate('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigate('next'));

    // Initialize modal close functionality
    // Dialog element handles close functionality natively

    // Initialize intersection observer for video previews
    this.initVideoObserver();

    // Initialize navigation state and scroll listeners
    this.initCarouselScrolling();
  }

  initVideoObserver() {
    // Pause preview videos when they're out of view
    const videos = this.section.querySelectorAll('.spectrum-carousel__preview');

    if (videos.length === 0 || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Video autoplay blocked, that's okay
            });
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '50px',
      },
    );

    videos.forEach((video) => observer.observe(video));
  }

  initCarouselScrolling() {
    // Initialize navigation state on load
    setTimeout(() => this.updateNavigationState(), 100);

    // Add scroll listener to update navigation state during manual scrolling
    const track = this.section.querySelector('.spectrum-carousel__track');
    if (track) {
      track.addEventListener('scroll', () => {
        // Debounce the navigation state update
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.updateNavigationState();
        }, 100);
      });

      // Update navigation state on resize
      window.addEventListener('resize', () => {
        setTimeout(() => this.updateNavigationState(), 100);
      });
    }
  }

  openModal(trigger) {
    const videoUrl = trigger.dataset.videoUrl;
    const videoTitle = trigger.dataset.videoTitle;
    const videoId = trigger.dataset.videoId;

    if (!this.modal) {
      console.warn('Spectrum modal not found');
      return;
    }

    // Initialize modal carousel state
    this.currentVideoIndex = parseInt(trigger.dataset.videoIndex) || 0;
    this.videoData = this.gatherVideoData();

    // Create modal content dynamically
    this.createModalContent();

    // Initialize content based on screen size and ensure proper visibility
    const desktopContainer = this.modal.querySelector(
      '.spectrum-modal__desktop-only',
    );
    const mobileContainer = this.modal.querySelector(
      '.spectrum-modal__mobile-only',
    );

    if (window.innerWidth > 749) {
      // Desktop: Show carousel, hide mobile
      if (desktopContainer) {
        desktopContainer.style.display = 'flex';
        desktopContainer.style.visibility = 'visible';
        desktopContainer.style.opacity = '1';
      }
      if (mobileContainer) {
        mobileContainer.style.display = 'none';
        mobileContainer.style.visibility = 'hidden';
        mobileContainer.style.opacity = '0';
      }
      this.createVideoCarousel();
    } else {
      // Mobile: Show single video, hide carousel
      if (desktopContainer) {
        desktopContainer.style.display = 'none';
        desktopContainer.style.visibility = 'hidden';
        desktopContainer.style.opacity = '0';
      }
      if (mobileContainer) {
        mobileContainer.style.display = 'block';
        mobileContainer.style.visibility = 'visible';
        mobileContainer.style.opacity = '1';
      }
      this.switchToVideo(this.currentVideoIndex);
      this.initScrollNavigation();
    }

    // Show dialog using native dialog API
    this.modal.showModal();
    this.modal.classList.add('active');

    // Focus management (after content is created)
    setTimeout(() => {
      const closeBtn = this.modal.querySelector('.spectrum-modal__close');
      if (closeBtn) closeBtn.focus();
    }, 100);

    // Emit custom event for analytics/tracking
    this.emit('spectrum:video:open', {
      videoId,
      videoTitle,
      videoUrl,
      videoIndex: this.currentVideoIndex,
    });
  }

  createModalContent() {
    // Only create content if it doesn't exist
    if (this.modal.querySelector('.spectrum-modal__container')) return;

    const modalHTML = `
      <div class="spectrum-modal__container">
        <button class="spectrum-modal__back" type="button" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <button class="spectrum-modal__cart" type="button" aria-label="View cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke-width="2"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke-width="2"/>
            <path d="M16 10a4 4 0 0 1-8 0" stroke-width="2"/>
          </svg>
        </button>

        <div class="spectrum-modal__content">
          <!-- Desktop: Multi-video carousel -->
          <div class="spectrum-modal__carousel-container spectrum-modal__desktop-only">
            <button class="spectrum-modal__video-nav-prev" type="button" aria-label="Previous video">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke-width="2"/>
              </svg>
            </button>

            <div class="spectrum-modal__video-track">
              <!-- Video panels will be dynamically inserted here -->
            </div>

            <button class="spectrum-modal__video-nav-next" type="button" aria-label="Next video">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- Mobile: Single video container -->
          <div class="spectrum-modal__video-container spectrum-modal__mobile-only">
            <video class="spectrum-modal__player" playsinline preload="metadata" muted loop></video>

            <button class="spectrum-modal__mute-btn" type="button" aria-label="Toggle mute">
              <svg class="spectrum-modal__mute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M18.36 6.64a9 9 0 0 1 0 10.72"/>
              </svg>
              <svg class="spectrum-modal__unmute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            </button>

            <!-- Product overlay for mobile -->
            <div class="spectrum-modal__product-overlay">
              <div class="spectrum-modal__products-container">
                <div class="spectrum-modal__products-track">
                  <!-- Products will be dynamically inserted here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modal.innerHTML = modalHTML;

    // Setup event listeners for close functionality
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    const closeBtn = this.modal.querySelector('.spectrum-modal__close');
    const backBtn = this.modal.querySelector('.spectrum-modal__back');
    const muteBtn = this.modal.querySelector('.spectrum-modal__mute-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.closeModal());
    }

    // Handle clicks outside the dialog content to close
    this.modal.addEventListener('click', (e) => {
      const rect = this.modal.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.bottom &&
        rect.left <= e.clientX &&
        e.clientX <= rect.right;
      if (!isInDialog) {
        this.closeModal();
      }
    });

    // Mute button only exists in mobile view
    if (muteBtn) {
      muteBtn.addEventListener('click', () => this.toggleMute());
    }

    // Setup navigation buttons for video carousel
    const videoPrevBtn = this.modal.querySelector(
      '.spectrum-modal__video-nav-prev',
    );
    const videoNextBtn = this.modal.querySelector(
      '.spectrum-modal__video-nav-next',
    );

    if (videoPrevBtn) {
      videoPrevBtn.addEventListener('click', () => this.navigateVideos('prev'));
    }

    if (videoNextBtn) {
      videoNextBtn.addEventListener('click', () => this.navigateVideos('next'));
    }

    // Product carousel navigation removed - now scroll-only

    // Dialog element handles Escape key natively, no need for custom handler
  }

  toggleMute(targetVideo = null, targetButton = null) {
    // If specific video and button are provided (desktop), use them
    // Otherwise use the mobile modal player (backward compatibility)
    const player =
      targetVideo || this.modal.querySelector('.spectrum-modal__player');

    let muteIcon, unmuteIcon;
    if (targetButton) {
      // Desktop: get icons from the specific button
      muteIcon = targetButton.querySelector('.spectrum-modal__mute-icon');
      unmuteIcon = targetButton.querySelector('.spectrum-modal__unmute-icon');
    } else {
      // Mobile: get icons from modal
      muteIcon = this.modal.querySelector('.spectrum-modal__mute-icon');
      unmuteIcon = this.modal.querySelector('.spectrum-modal__unmute-icon');
    }

    if (!player) {
      console.warn('Player not found for mute toggle');
      return;
    }

    // Toggle muted state
    player.muted = !player.muted;

    // Update icon visibility
    if (muteIcon && unmuteIcon) {
      if (player.muted) {
        // When muted, show unmute icon (speaker with X)
        muteIcon.style.display = 'none';
        unmuteIcon.style.display = 'block';
      } else {
        // When unmuted, show mute icon (normal speaker)
        muteIcon.style.display = 'block';
        unmuteIcon.style.display = 'none';
      }
    }

    // Update ARIA label
    const button =
      targetButton || this.modal.querySelector('.spectrum-modal__mute-btn');
    if (button) {
      button.setAttribute(
        'aria-label',
        player.muted ? 'Unmute video' : 'Mute video',
      );
    }

    // Log for debugging
    console.log('Mute toggled:', {
      muted: player.muted,
      context: targetButton ? 'desktop' : 'mobile',
    });

    // Emit mute toggle event
    this.emit('spectrum:video:mute-toggle', {
      muted: player.muted,
      videoIndex: this.currentVideoIndex,
      context: targetButton ? 'desktop' : 'mobile',
    });
  }

  closeModal() {
    if (!this.modal) return;

    // Stop all videos (mobile single video or desktop carousel videos)
    const players = this.modal.querySelectorAll('video');
    players.forEach((player) => {
      player.pause();
      player.src = '';
    });

    // Clean up scroll navigation
    this.cleanupScrollNavigation();

    // Hide dialog using native dialog API
    this.modal.classList.remove('active');
    this.modal.close();

    // Destroy modal content to free memory
    this.modal.innerHTML = '';

    // Emit custom event
    this.emit('spectrum:video:close', {
      sectionId: this.sectionId,
    });
  }

  cleanupScrollNavigation() {
    // Since we're destroying modal content, no need for complex cleanup
    // Event listeners will be automatically removed when DOM elements are destroyed
    this.scrollTimeout = null;
    this.lastScrollTime = 0;
    this.isScrolling = false;
    this.scrollDirection = 0;
  }

  initScrollNavigation() {
    if (!this.modal) return;

    // Reset scroll navigation state
    this.scrollTimeout = null;
    this.lastScrollTime = 0;
    this.isScrolling = false;
    this.scrollDirection = 0;

    // Add wheel event listener to modal
    this.modal.addEventListener('wheel', (e) => {
      e.preventDefault(); // Prevent default scrolling

      const now = Date.now();
      const timeDelta = now - this.lastScrollTime;

      // Throttle scroll events to prevent rapid switching
      if (timeDelta < 300) return;

      this.lastScrollTime = now;

      // Determine scroll direction and switch video
      if (e.deltaY > 0) {
        // Scrolling down - next video
        this.navigateToNextVideo();
      } else if (e.deltaY < 0) {
        // Scrolling up - previous video
        this.navigateToPrevVideo();
      }
    });

    // Add keyboard navigation
    this.modal.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigateToPrevVideo();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateToNextVideo();
          break;
      }
    });

    // Touch/swipe navigation for mobile
    this.initTouchNavigation();
  }

  initTouchNavigation() {
    let startY = 0;
    let endY = 0;
    let isTouch = false;

    this.modal.addEventListener(
      'touchstart',
      (e) => {
        startY = e.touches[0].clientY;
        isTouch = true;
      },
      { passive: true },
    );

    this.modal.addEventListener(
      'touchend',
      (e) => {
        if (!isTouch) return;

        endY = e.changedTouches[0].clientY;
        const deltaY = startY - endY;

        // Minimum swipe distance to trigger video change
        if (Math.abs(deltaY) > 50) {
          if (deltaY > 0) {
            // Swipe up - next video
            this.navigateToNextVideo();
          } else {
            // Swipe down - previous video
            this.navigateToPrevVideo();
          }
        }

        isTouch = false;
      },
      { passive: true },
    );
  }

  navigateToNextVideo() {
    if (this.currentVideoIndex < this.videoData.length - 1) {
      this.switchToVideo(this.currentVideoIndex + 1);
    }
  }

  navigateToPrevVideo() {
    if (this.currentVideoIndex > 0) {
      this.switchToVideo(this.currentVideoIndex - 1);
    }
  }

  switchToVideo(index) {
    if (!this.videoData || index < 0 || index >= this.videoData.length) return;

    const videoItem = this.videoData[index];
    const videoUrl = videoItem.videoUrl;
    const videoTitle = videoItem.videoTitle;
    const videoId = videoItem.videoId;

    // Update video player
    const player = this.modal.querySelector('.spectrum-modal__player');
    if (player && videoUrl) {
      player.src = videoUrl;
      player.setAttribute('aria-label', videoTitle || 'Video');

      // Auto-play when switching videos
      player.play().catch(() => {
        console.log('Video autoplay blocked');
      });
    }

    // Load products for this video
    this.loadModalProducts(videoId);

    // Update current index
    this.currentVideoIndex = index;

    // Emit video switch event
    this.emit('spectrum:video:switch', {
      videoId,
      videoTitle,
      videoUrl,
      videoIndex: index,
    });
  }

  loadModalProducts(videoId) {
    const productsScript = document.querySelector(
      `script[data-modal-products-for="${videoId}"]`,
    );

    // For mobile, find the product overlay in the mobile container
    const mobileContainer = this.modal.querySelector('.spectrum-modal__mobile-only');
    if (!mobileContainer) return;

    const productOverlay = mobileContainer.querySelector(
      '.spectrum-modal__product-overlay',
    );

    if (!productsScript || !productOverlay) {
      if (productOverlay) {
        productOverlay.classList.remove('visible');
      }
      return;
    }

    try {
      const products = JSON.parse(productsScript.textContent);

      if (products.length === 0) {
        productOverlay.classList.remove('visible');
        return;
      }

      // Render all products in the carousel
      this.renderProductCarousel(products);

      // Show overlay with animation delay
      setTimeout(() => {
        productOverlay.classList.add('visible');
      }, 500);
    } catch (error) {
      console.error('Error loading modal products for video:', videoId, error);
      productOverlay.classList.remove('visible');
    }
  }

  renderProductCarousel(products) {
    // For mobile, target the track in mobile container
    const mobileContainer = this.modal.querySelector('.spectrum-modal__mobile-only');
    const track = mobileContainer ? mobileContainer.querySelector('.spectrum-modal__products-track') : null;

    if (!track) {
      console.error('Product track not found');
      return;
    }

    // Clear existing products
    track.innerHTML = '';

    console.log('Rendering', products.length, 'products');

    // Create product cards or fallback
    if (products.length === 0) {
      // Show fallback message
      track.innerHTML = `
        <div class="spectrum-modal__no-products">
          <p>No products available for this video</p>
        </div>
      `;
    } else {
      products.forEach((product, index) => {
        const productCard = this.createProductCard(product, index);
        track.appendChild(productCard);
      });
    }
  }

  createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'spectrum-modal__product-card';

    // Escape HTML to prevent XSS
    const escapeHtml = (str) => {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    // Provide fallbacks for missing data
    const productTitle = product.title || 'Untitled Product';
    const productPrice = product.price || '$0.00';
    const productImage = product.image || '';
    const productUrl = product.url || '#';

    card.innerHTML = `
      <div class="spectrum-modal__product-info">
        ${
          productImage
            ? `<img class="spectrum-modal__product-image" src="${escapeHtml(productImage)}" alt="${escapeHtml(productTitle)}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="spectrum-modal__product-image spectrum-modal__product-image--placeholder"></div>`
        }
        <div class="spectrum-modal__product-details">
          <h3 class="spectrum-modal__product-title">${escapeHtml(productTitle)}</h3>
          <div class="spectrum-modal__product-price">${escapeHtml(productPrice)}</div>
          ${!product.available ? '<div class="spectrum-modal__product-status">Sold out</div>' : ''}
        </div>
        <button class="spectrum-modal__pdp-toggle" type="button" data-product-id="${escapeHtml(product.id)}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke-width="2"></path>
            <line x1="3" y1="6" x2="21" y2="6" stroke-width="2"></line>
            <path d="M16 10a4 4 0 0 1-8 0" stroke-width="2"></path>
          </svg>
        </button>
      </div>
    `;

    // Add click tracking for PDP toggle button
    const pdpToggle = card.querySelector('.spectrum-modal__pdp-toggle');
    if (pdpToggle) {
      pdpToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleMiniPDP(card, product, index);

        // Emit product click event
        this.emit('spectrum:product:pdp-toggle', {
          productId: product.id,
          productTitle: productTitle,
          productHandle: product.handle,
          source: 'modal_overlay',
          productIndex: index,
        });
      });
    }

    return card;
  }

  toggleMiniPDP(card, product, index) {
    // Check if mini PDP is already open
    const existingMiniPDP = card.querySelector('.spectrum-modal__mini-pdp');

    if (existingMiniPDP) {
      // Close the mini PDP
      this.closeMiniPDP(card);
    } else {
      // Close any other open mini PDPs first
      const allCards = this.modal.querySelectorAll(
        '.spectrum-modal__product-card',
      );
      allCards.forEach((otherCard) => this.closeMiniPDP(otherCard));

      // Open mini PDP for this product
      this.openMiniPDP(card, product, index);
    }
  }

  openMiniPDP(card, product, index) {
    const escapeHtml = (str) => {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    // Create mini PDP content using dialog element
    const miniPDP = document.createElement('dialog');
    miniPDP.className = 'spectrum-modal__mini-pdp';

    miniPDP.innerHTML = `
      <div class="spectrum-pdp">
        <!-- Close Button -->
        <button class="spectrum-pdp__close" type="button" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Left Side: Product Gallery -->
        <div class="spectrum-pdp__left">
          ${
            product.images && product.images.length > 0
              ? `
            <div class="spectrum-pdp__gallery">
              <div class="spectrum-pdp__gallery-scroll">
                ${product.images
                  .map(
                    (image, idx) => `
                  <div class="spectrum-pdp__gallery-item">
                    <img src="${escapeHtml(image)}"
                         alt="${escapeHtml(product.title || 'Product')} - Image ${idx + 1}"
                         class="spectrum-pdp__gallery-image" />
                  </div>
                `,
                  )
                  .join('')}
              </div>
            </div>
          `
              : `
            <div class="spectrum-pdp__gallery">
              <div class="spectrum-pdp__gallery-scroll">
                <div class="spectrum-pdp__gallery-item">
                  <img src="${escapeHtml(product.image || '')}"
                       alt="${escapeHtml(product.title || 'Product')}"
                       class="spectrum-pdp__gallery-image" />
                </div>
              </div>
            </div>
          `
          }

          <!-- Action Icons positioned absolutely -->
          <div class="spectrum-pdp__action-icons">
            <button class="spectrum-pdp__action-icon" type="button" aria-label="Share product">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            <button class="spectrum-pdp__action-icon" type="button" aria-label="External link" onclick="window.location.href='${escapeHtml(product.url || '#')}'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Right Side: Product Details -->
        <div class="spectrum-pdp__right">
          <h1 class="spectrum-pdp__title">${escapeHtml(product.title || 'Product')}</h1>

          <div class="spectrum-pdp__price-section">
            <span class="spectrum-pdp__current-price">${escapeHtml(product.price || '₹0')}</span>
            ${
              product.compare_at_price &&
              product.compare_at_price !== product.price
                ? `
              <span class="spectrum-pdp__original-price">${escapeHtml(product.compare_at_price)}</span>
              <span class="spectrum-pdp__discount">50% OFF</span>
            `
                : ''
            }
          </div>

          ${
            product.variants && product.variants.length > 1
              ? `
            <div class="spectrum-pdp__size-section">
              <div class="spectrum-pdp__size-options">
                ${product.variants
                  .map(
                    (variant, idx) => `
                  <button class="spectrum-pdp__size-option ${idx === 0 ? 'selected' : ''}"
                          type="button"
                          data-variant-id="${escapeHtml(variant.id)}"
                          ${!variant.available ? 'disabled' : ''}>
                    ${escapeHtml(variant.title)}
                  </button>
                `,
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }

          <div class="spectrum-pdp__stock-status">
            ${(() => {
              // Get the selected variant or first variant
              const selectedVariant =
                product.variants && product.variants.length > 0
                  ? product.variants[0]
                  : null;

              const quantity = selectedVariant
                ? selectedVariant.inventory_quantity || 0
                : product.inventory_quantity || 0;

              // Only show urgency callout for low stock items, not out of stock
              if (quantity > 0 && quantity <= 20) {
                return `<span class="spectrum-pdp__stock-indicator">🔥 Low in stock - Only ${quantity} available</span>`;
              } else if (quantity > 20) {
                return `<span class="spectrum-pdp__stock-indicator in-stock">In Stock</span>`;
              } else {
                return ''; // Don't show anything for out of stock items
              }
            })()}
          </div>

          <div class="spectrum-pdp__actions">
            ${(() => {
              // Check initial stock status
              const selectedVariant =
                product.variants && product.variants.length > 0
                  ? product.variants[0]
                  : null;

              const quantity = selectedVariant
                ? selectedVariant.inventory_quantity || 0
                : product.inventory_quantity || 0;

              if (product.available && quantity > 0) {
                return `
                  <button class="spectrum-pdp__buy-now" type="button" data-product-id="${escapeHtml(product.id)}">
                    BUY NOW
                  </button>
                  <button class="spectrum-pdp__add-to-bag" type="button" data-product-id="${escapeHtml(product.id)}">
                    ADD TO BAG
                  </button>
                `;
              } else {
                return `
                  <button class="spectrum-pdp__buy-now disabled" type="button" disabled>
                    OUT OF STOCK
                  </button>
                  <button class="spectrum-pdp__add-to-bag disabled" type="button" disabled>
                    OUT OF STOCK
                  </button>
                `;
              }
            })()}
          </div>
        </div>
      </div>
    `;

    // Add mini PDP to card
    card.appendChild(miniPDP);

    // Add close functionality
    const closeBtn = miniPDP.querySelector('.spectrum-pdp__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeMiniPDP(card));
    }

    // Close dialog when clicking outside (on backdrop)
    miniPDP.addEventListener('click', (e) => {
      if (e.target === miniPDP) {
        this.closeMiniPDP(card);
      }
    });

    // Handle Escape key to close dialog
    miniPDP.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMiniPDP(card);
      }
    });

    // Gallery thumbnail functionality
    const thumbnails = miniPDP.querySelectorAll('.spectrum-pdp__thumbnail');
    const mainImage = miniPDP.querySelector('.spectrum-pdp__main-image');

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener('click', () => {
        // Remove active class from all thumbnails
        thumbnails.forEach((t) => t.classList.remove('active'));
        // Add active class to clicked thumbnail
        thumbnail.classList.add('active');
        // Update main image
        const newImageSrc = thumbnail.dataset.image;
        if (mainImage && newImageSrc) {
          mainImage.src = newImageSrc;
        }
      });
    });

    // Add size selection functionality
    const sizeOptions = miniPDP.querySelectorAll('.spectrum-pdp__size-option');
    const stockIndicator = miniPDP.querySelector(
      '.spectrum-pdp__stock-indicator',
    );
    let selectedVariantId = null;

    sizeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        if (option.disabled) return;

        // Remove selected class from all options
        sizeOptions.forEach((opt) => opt.classList.remove('selected'));
        // Add selected class to clicked option
        option.classList.add('selected');
        // Store selected variant ID
        selectedVariantId = option.dataset.variantId;

        // Update stock status based on selected variant
        if (product.variants) {
          const selectedVariant = product.variants.find(
            (v) => String(v.id) === String(selectedVariantId),
          );

          if (selectedVariant) {
            const quantity = selectedVariant.inventory_quantity || 0;
            const stockStatusDiv = miniPDP.querySelector(
              '.spectrum-pdp__stock-status',
            );

            // Update urgency callout - only show for low stock, hide for out of stock
            if (stockStatusDiv) {
              if (quantity > 0 && quantity <= 20) {
                stockStatusDiv.innerHTML = `<span class="spectrum-pdp__stock-indicator">🔥 Low in stock - Only ${quantity} available</span>`;
              } else if (quantity > 20) {
                stockStatusDiv.innerHTML = `<span class="spectrum-pdp__stock-indicator in-stock">In Stock</span>`;
              } else {
                stockStatusDiv.innerHTML = ''; // Hide urgency callout for out of stock
              }
            }

            // Update both button states
            const addToCartBtn = miniPDP.querySelector('.spectrum-pdp__add-to-bag');
            const buyNowBtn = miniPDP.querySelector('.spectrum-pdp__buy-now');

            if (selectedVariant.available && quantity > 0) {
              if (addToCartBtn) {
                addToCartBtn.disabled = false;
                addToCartBtn.classList.remove('disabled');
                addToCartBtn.textContent = 'ADD TO BAG';
              }
              if (buyNowBtn) {
                buyNowBtn.disabled = false;
                buyNowBtn.classList.remove('disabled');
                buyNowBtn.textContent = 'BUY NOW';
              }
            } else {
              if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.classList.add('disabled');
                addToCartBtn.textContent = 'OUT OF STOCK';
              }
              if (buyNowBtn) {
                buyNowBtn.disabled = true;
                buyNowBtn.classList.add('disabled');
                buyNowBtn.textContent = 'OUT OF STOCK';
              }
            }
          }
        }
      });
    });

    // Set initial selected variant
    if (sizeOptions.length > 0) {
      const firstAvailable = Array.from(sizeOptions).find(
        (opt) => !opt.disabled,
      );
      if (firstAvailable) {
        selectedVariantId = firstAvailable.dataset.variantId;
      } else if (sizeOptions[0]) {
        selectedVariantId = sizeOptions[0].dataset.variantId;
      }
    } else if (product.variants && product.variants.length > 0) {
      // For products without size options, use first available variant
      const firstAvailableVariant = product.variants.find((v) => v.available);
      selectedVariantId = (firstAvailableVariant || product.variants[0]).id;
    } else {
      // For simple products without variants, use product ID as variant ID
      selectedVariantId = product.id;
    }

    // Add add to bag functionality
    const addToBagBtn = miniPDP.querySelector('.spectrum-pdp__add-to-bag');
    if (addToBagBtn && !addToBagBtn.disabled) {
      addToBagBtn.addEventListener('click', () => {
        const productToAdd = {
          ...product,
          selectedVariantId: selectedVariantId || product.id,
        };
        this.addToCart(productToAdd, index);
      });
    }

    // Add buy now functionality
    const buyNowBtn = miniPDP.querySelector('.spectrum-pdp__buy-now');
    if (buyNowBtn && !buyNowBtn.disabled) {
      buyNowBtn.addEventListener('click', () => {
        const productToAdd = {
          ...product,
          selectedVariantId: selectedVariantId || product.id,
        };
        this.buyNow(productToAdd, index);
      });
    }

    // Add share functionality
    const shareBtn = miniPDP.querySelector(
      '.spectrum-pdp__action-icon[aria-label="Share product"]',
    );
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareProduct(product));
    }

    // Update toggle button state
    const toggle = card.querySelector('.spectrum-modal__pdp-toggle');
    if (toggle) {
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
    }

    // Show dialog
    miniPDP.showModal();

    // Animate in
    setTimeout(() => {
      miniPDP.classList.add('visible');
    }, 10);
  }

  closeMiniPDP(card) {
    const miniPDP = card.querySelector('.spectrum-modal__mini-pdp');
    if (miniPDP) {
      miniPDP.classList.remove('visible');

      setTimeout(() => {
        miniPDP.close(); // Close the dialog properly
        miniPDP.remove();
      }, 200);
    }

    // Update toggle button state
    const toggle = card.querySelector('.spectrum-modal__pdp-toggle');
    if (toggle) {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  addToCart(product, index) {
    // Get the selected variant ID or fallback to product ID
    const variantId = product.selectedVariantId || product.id;

    if (!variantId) {
      console.error('Variant ID not found', product);
      return;
    }

    console.log('Adding to cart:', {
      variantId: variantId,
      productTitle: product.title,
      productId: product.id,
    });

    // Find the add to cart button to show loading state
    const addToCartBtn = document.querySelector(`[data-product-id="${product.id}"] .spectrum-pdp__add-to-bag`);
    if (addToCartBtn) {
      this.setButtonLoadingState(addToCartBtn, true);
    }

    // Check if global addToCart function exists and use it
    if (typeof window.addToCart === 'function') {
      // Use the global addToCart function
      try {
        window.addToCart(variantId, 1);

        // Simulate a brief loading time for better UX
        setTimeout(() => {
          if (addToCartBtn) {
            this.setButtonLoadingState(addToCartBtn, false);
          }

          // Emit add to cart event
          this.emit('spectrum:product:add-to-cart', {
            productId: product.id,
            productTitle: product.title,
            productHandle: product.handle,
            source: 'mini_pdp',
            productIndex: index,
          });

          this.showAddToCartSuccess(product);
        }, 500);
      } catch (error) {
        console.error('Error with global addToCart:', error);
        if (addToCartBtn) {
          this.setButtonLoadingState(addToCartBtn, false);
        }
        this.showAddToCartError(product);
      }
    } else {
      // Fallback implementation
      console.warn('Global addToCart function not found, using fallback');

      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', 1);

      fetch('/cart/add', {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((data) => {
          console.log('Product added to cart:', data);

          if (addToCartBtn) {
            this.setButtonLoadingState(addToCartBtn, false);
          }

          this.emit('spectrum:product:add-to-cart', {
            productId: product.id,
            productTitle: product.title,
            productHandle: product.handle,
            source: 'mini_pdp',
            productIndex: index,
          });
          this.showAddToCartSuccess(product);
        })
        .catch((error) => {
          console.error('Error adding to cart:', error);

          if (addToCartBtn) {
            this.setButtonLoadingState(addToCartBtn, false);
          }

          this.showAddToCartError(product);
        });
    }
  }

  buyNow(product, index) {
    // Get the selected variant ID or fallback to product ID
    const variantId = product.selectedVariantId || product.id;

    if (!variantId) {
      console.error('Variant ID not found for buy now', product);
      return;
    }

    console.log('Buy now:', {
      variantId: variantId,
      productTitle: product.title,
      productId: product.id,
    });

    // Find the buy now button to show loading state
    const buyNowBtn = document.querySelector(`[data-product-id="${product.id}"] .spectrum-pdp__buy-now`);
    if (buyNowBtn) {
      this.setBuyNowLoadingState(buyNowBtn, true);
    }

    // Add to cart first, then redirect to checkout
    if (typeof window.addToCart === 'function') {
      try {
        window.addToCart(variantId, 1);

        // Brief delay then redirect to checkout
        setTimeout(() => {
          window.location.href = '/checkout';
        }, 500);
      } catch (error) {
        console.error('Error with buy now:', error);
        if (buyNowBtn) {
          this.setBuyNowLoadingState(buyNowBtn, false);
        }
        this.showAddToCartError(product);
      }
    } else {
      // Fallback implementation
      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', 1);

      fetch('/cart/add', {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          // Redirect to checkout after successful add
          window.location.href = '/checkout';
        })
        .catch((error) => {
          console.error('Error with buy now:', error);
          if (buyNowBtn) {
            this.setBuyNowLoadingState(buyNowBtn, false);
          }
          this.showAddToCartError(product);
        });
    }

    // Emit buy now event
    this.emit('spectrum:product:buy-now', {
      productId: product.id,
      productTitle: product.title,
      productHandle: product.handle,
      source: 'mini_pdp',
      productIndex: index,
    });
  }

  setButtonLoadingState(button, isLoading) {
    if (isLoading) {
      // Store original text
      button.dataset.originalText = button.textContent;

      // Add loading class and spinner
      button.classList.add('loading');
      button.disabled = true;
      button.innerHTML = `
        <span class="spectrum-pdp__spinner"></span>
        ADDING...
      `;
    } else {
      // Restore original state
      button.classList.remove('loading');
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'ADD TO BAG';
      delete button.dataset.originalText;
    }
  }

  setBuyNowLoadingState(button, isLoading) {
    if (isLoading) {
      // Store original text
      button.dataset.originalText = button.textContent;

      // Add loading class and spinner
      button.classList.add('loading');
      button.disabled = true;
      button.innerHTML = `
        <span class="spectrum-pdp__spinner"></span>
        PROCESSING...
      `;
    } else {
      // Restore original state
      button.classList.remove('loading');
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'BUY NOW';
      delete button.dataset.originalText;
    }
  }

  showAddToCartSuccess(product) {
    // Simple success notification - can be customized
    const notification = document.createElement('div');
    notification.className =
      'spectrum-modal__notification spectrum-modal__notification--success';
    notification.textContent = `${product.title} added to cart!`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }

  showAddToCartError(product) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.className =
      'spectrum-modal__notification spectrum-modal__notification--error';
    notification.textContent = `Error adding ${product.title} to cart. Please try again.`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }

  shareProduct(product) {
    // Modern Web Share API with fallback
    if (navigator.share) {
      navigator
        .share({
          title: product.title,
          text: `Check out this ${product.title}`,
          url: product.url || window.location.href,
        })
        .then(() => {
          console.log('Product shared successfully');
        })
        .catch((error) => {
          console.log('Error sharing:', error);
          this.fallbackShare(product);
        });
    } else {
      this.fallbackShare(product);
    }
  }

  fallbackShare(product) {
    // Fallback: Copy to clipboard
    const shareUrl = product.url || window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          this.showShareSuccess(product);
        })
        .catch(() => {
          this.showManualShare(shareUrl);
        });
    } else {
      this.showManualShare(shareUrl);
    }
  }

  showShareSuccess(product) {
    const notification = document.createElement('div');
    notification.className =
      'spectrum-modal__notification spectrum-modal__notification--success';
    notification.textContent = `Product link copied to clipboard!`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 200);
    }, 2000);
  }

  showManualShare(url) {
    // Simple prompt fallback for older browsers
    prompt('Copy this link to share:', url);
  }

  loadProducts(videoId) {
    const productsScript = document.querySelector(
      `script[data-products-for="${videoId}"]`,
    );

    // Find the center panel which contains the product overlay
    const centerPanel = this.modal.querySelector('.spectrum-modal__video-panel--center');
    if (!centerPanel) return;

    const productsTrack = centerPanel.querySelector(
      '.spectrum-modal__products-track',
    );
    const productsOverlay = centerPanel.querySelector(
      '.spectrum-modal__product-overlay',
    );

    if (!productsScript || !productsTrack || !productsOverlay) return;

    try {
      const products = JSON.parse(productsScript.textContent);
      productsTrack.innerHTML = '';

      if (products.length === 0) {
        productsOverlay.style.display = 'none';
        return;
      }

      products.forEach((product, index) => {
        const card = this.createProductCard(product, index);
        productsTrack.appendChild(card);
      });

      // Show products overlay
      productsOverlay.classList.add('visible');

      // Emit event for products loaded
      this.emit('spectrum:products:loaded', {
        videoId,
        productCount: products.length,
      });
    } catch (error) {
      console.error('Error loading products for video:', videoId, error);
      productsOverlay.classList.remove('visible');
    }
  }

  // Product navigation methods removed - products now scroll freely

  gatherVideoData() {
    // Gather all video data from the section
    const videoTriggers = this.section.querySelectorAll(
      '.spectrum-carousel__trigger',
    );
    return Array.from(videoTriggers).map((trigger, index) => ({
      index,
      videoUrl: trigger.dataset.videoUrl,
      videoTitle: trigger.dataset.videoTitle,
      videoId: trigger.dataset.videoId,
      trigger,
    }));
  }

  createVideoCarousel() {
    // Only for desktop - populate the video carousel
    const track = this.modal.querySelector('.spectrum-modal__video-track');
    if (!track) return;

    track.innerHTML = '';

    // Create 3 video panels centered around current video
    const centerIndex = this.currentVideoIndex;
    const videoCount = this.videoData.length;

    for (let i = -1; i <= 1; i++) {
      const videoIndex = (centerIndex + i + videoCount) % videoCount;
      const videoItem = this.videoData[videoIndex];
      const panel = this.createVideoPanel(videoItem, i);
      track.appendChild(panel);
    }

    // Update navigation button states
    this.updateVideoNavButtons();

    // Load products for the center video
    const currentVideo = this.videoData[this.currentVideoIndex];
    if (currentVideo && currentVideo.videoId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.loadProducts(currentVideo.videoId);
      }, 100);
    }
  }

  createVideoPanel(videoItem, positionOffset) {
    const panel = document.createElement('div');
    panel.className = 'spectrum-modal__video-panel';

    // Assign size class based on position (only center and side for 3-panel layout)
    if (positionOffset === 0) {
      panel.classList.add('spectrum-modal__video-panel--center');
    } else {
      panel.classList.add('spectrum-modal__video-panel--side');
    }

    panel.innerHTML = `
      <div class="spectrum-modal__video-wrapper">
        <video
          src="${videoItem.videoUrl}"
          ${positionOffset === 0 ? 'autoplay' : ''}
          muted
          loop
          playsinline
          preload="metadata"
          aria-label="${videoItem.videoTitle || 'Video'}"
        ></video>
        ${
          positionOffset === 0
            ? `
          <button class="spectrum-modal__mute-btn spectrum-modal__mute-btn--desktop" type="button" aria-label="Toggle mute">
            <svg class="spectrum-modal__mute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07M18.36 6.64a9 9 0 0 1 0 10.72"/>
            </svg>
            <svg class="spectrum-modal__unmute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: none;">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>
          <!-- Product overlay for center panel -->
          <div class="spectrum-modal__product-overlay">
            <div class="spectrum-modal__products-container">
              <div class="spectrum-modal__products-track">
                <!-- Products will be dynamically inserted here -->
              </div>
            </div>
          </div>
        `
            : ''
        }
      </div>
      <div class="spectrum-modal__video-title">${videoItem.videoTitle || ''}</div>
    `;

    // Add click handler for non-center panels
    if (positionOffset !== 0) {
      panel.style.cursor = 'pointer';
      panel.addEventListener('click', () => {
        this.navigateToVideo(videoItem.index);
      });
    } else {
      // Add mute button event listener for center panel
      const muteBtn = panel.querySelector('.spectrum-modal__mute-btn--desktop');
      if (muteBtn) {
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent panel click
          const video = panel.querySelector('video');
          this.toggleMute(video, muteBtn);
        });
      }
    }

    return panel;
  }

  navigateVideos(direction) {
    // Desktop video carousel navigation
    const videoCount = this.videoData.length;

    if (direction === 'prev') {
      this.currentVideoIndex =
        (this.currentVideoIndex - 1 + videoCount) % videoCount;
    } else {
      this.currentVideoIndex = (this.currentVideoIndex + 1) % videoCount;
    }

    // Recreate carousel with new center (this will also load products)
    this.createVideoCarousel();
  }

  navigateToVideo(targetIndex) {
    // Direct navigation to specific video
    this.currentVideoIndex = targetIndex;

    // Recreate carousel with new center (this will also load products)
    this.createVideoCarousel();
  }

  updateVideoNavButtons() {
    const prevBtn = this.modal.querySelector('.spectrum-modal__video-nav-prev');
    const nextBtn = this.modal.querySelector('.spectrum-modal__video-nav-next');

    if (!prevBtn || !nextBtn || this.videoData.length <= 1) return;

    // Always show navigation for carousel (since it loops)
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
  }

  navigate(direction) {
    // Enhanced carousel navigation for horizontal scrolling
    const track = this.section.querySelector('.spectrum-carousel__track');
    if (!track) return;

    // Calculate slide width (including gap)
    const slides = track.querySelectorAll('.spectrum-carousel__slide');
    if (slides.length === 0) return;

    const slideWidth = slides[0].offsetWidth;
    const gap = 16; // 1rem = 16px gap
    const slideWidthWithGap = slideWidth + gap;

    // How many slides to scroll (2 slides at a time for better UX)
    const slidesToScroll = 2;
    const scrollAmount = slideWidthWithGap * slidesToScroll;

    const currentScroll = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.offsetWidth;

    let newScrollPosition;
    if (direction === 'prev') {
      newScrollPosition = Math.max(0, currentScroll - scrollAmount);
    } else {
      newScrollPosition = Math.min(maxScroll, currentScroll + scrollAmount);
    }

    track.scrollTo({
      left: newScrollPosition,
      behavior: 'smooth',
    });

    // Update navigation button states
    this.updateNavigationState();

    // Emit navigation event
    this.emit('spectrum:carousel:navigate', {
      direction,
      scrollPosition: newScrollPosition,
      slidesToScroll,
    });
  }

  updateNavigationState() {
    // Update navigation button disabled states
    const track = this.section.querySelector('.spectrum-carousel__track');
    const prevBtn = this.section.querySelector('.spectrum-carousel__nav-prev');
    const nextBtn = this.section.querySelector('.spectrum-carousel__nav-next');

    if (!track || !prevBtn || !nextBtn) return;

    const currentScroll = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.offsetWidth;

    // Disable/enable buttons based on scroll position
    prevBtn.disabled = currentScroll <= 0;
    nextBtn.disabled = currentScroll >= maxScroll - 1; // -1 for rounding errors

    // Add visual disabled state
    prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '0.9';
    nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '0.9';
    prevBtn.style.pointerEvents = prevBtn.disabled ? 'none' : 'all';
    nextBtn.style.pointerEvents = nextBtn.disabled ? 'none' : 'all';
  }

  emit(eventName, detail = {}) {
    // Emit custom events for tracking/analytics integration
    const event = new CustomEvent(eventName, {
      detail: {
        ...detail,
        sectionId: this.sectionId,
        timestamp: Date.now(),
      },
      bubbles: true,
      cancelable: true,
    });

    this.section.dispatchEvent(event);

    // Also emit globally for easier listening
    window.dispatchEvent(event);
  }

  // Public method to destroy instance
  destroy() {
    // Remove event listeners and clean up
    this.section
      .querySelectorAll('.spectrum-carousel__trigger')
      .forEach((trigger) => {
        trigger.replaceWith(trigger.cloneNode(true));
      });

    if (this.modal) {
      const closeBtn = this.modal.querySelector('.spectrum-modal__close');
      const backdrop = this.modal.querySelector('.spectrum-modal__backdrop');

      if (closeBtn) closeBtn.replaceWith(closeBtn.cloneNode(true));
      if (backdrop) backdrop.replaceWith(backdrop.cloneNode(true));
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.spectrum-carousel-videos');
  sections.forEach((section) => {
    // Store instance for potential cleanup
    section._spectrumCarousel = new SpectrumCarousel(section);
  });
});

// Re-initialize for Shopify theme editor
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('.spectrum-carousel-videos');
    if (section) {
      // Clean up existing instance
      if (section._spectrumCarousel) {
        section._spectrumCarousel.destroy();
      }
      // Create new instance
      section._spectrumCarousel = new SpectrumCarousel(section);
    }
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const section = event.target.querySelector('.spectrum-carousel-videos');
    if (section && section._spectrumCarousel) {
      section._spectrumCarousel.destroy();
      section._spectrumCarousel = null;
    }
  });
}

// Export for advanced usage
window.SpectrumCarousel = SpectrumCarousel;
