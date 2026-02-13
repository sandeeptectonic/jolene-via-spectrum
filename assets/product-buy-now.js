/**
 * Product Buy Now functionality
 * Handles the buy now button on product pages
 */

document.addEventListener('DOMContentLoaded', function() {
  // Add class to body for product page styling
  document.body.classList.add('product-page');

  // Move sticky buttons outside of any positioned containers
  const stickyButtonsContainer = document.querySelector('.product-form__sticky-buttons');
  if (stickyButtonsContainer) {
    // Clone the container
    const clonedContainer = stickyButtonsContainer.cloneNode(true);
    clonedContainer.classList.add('product-form__sticky-buttons--fixed');

    // Append to body to escape any positioning contexts
    document.body.appendChild(clonedContainer);

    // Hide the original
    stickyButtonsContainer.style.display = 'none';

    // Re-attach event listeners to the cloned buttons
    const clonedBuyNowButton = clonedContainer.querySelector('.product-form__buy-now');
    const clonedAddToCartButton = clonedContainer.querySelector('.product-form__submit');

    if (clonedBuyNowButton) {
      clonedBuyNowButton.addEventListener('click', function(e) {
        e.preventDefault();
        handleBuyNow(this);
      });
    }

    if (clonedAddToCartButton) {
      clonedAddToCartButton.addEventListener('click', function(e) {
        e.preventDefault();
        handleAddToCart(this);
      });
    }
  }

  const buyNowButtons = document.querySelectorAll('.product-form__buy-now');

  buyNowButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      handleBuyNow(this);
    });
  });

  function handleAddToCart(button) {
    // Find the form - check if it's from desktop or mobile/sticky version
    const form = button.closest('form');
    const originalForm = form || document.querySelector('form[data-type="add-to-cart-form"]');
    if (!originalForm) return;

    const variantId = originalForm.querySelector('input[name="id"]').value;
    const quantity = originalForm.querySelector('input[name="quantity"]')?.value || 1;

    if (!variantId) {
      console.error('No variant ID found');
      return;
    }

    // Set loading state
    setButtonLoadingState(button, true);

    // Submit the original form
    const formData = new FormData(originalForm);

    fetch(originalForm.action, {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      setButtonLoadingState(button, false);
      // Trigger any existing cart update logic
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
      showSuccess('Product added to cart!');
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      setButtonLoadingState(button, false);
      showError('Error adding product to cart. Please try again.');
    });
  }

  function handleBuyNow(button) {
    // Find the form - check if it's from desktop or mobile/sticky version
    const form = button.closest('form');
    const originalForm = form || document.querySelector('form[data-type="add-to-cart-form"]');
    if (!originalForm) return;

    const variantId = originalForm.querySelector('input[name="id"]').value;

    if (!variantId) {
      console.error('No variant ID found');
      return;
    }

    // Set loading state
    setButtonLoadingState(button, true);

    // Check if global addToCart function exists
    if (typeof window.addToCart === 'function') {
      try {
        window.addToCart(variantId, 1);

        // Brief delay then redirect to checkout
        setTimeout(() => {
          window.location.href = '/checkout';
        }, 500);
      } catch (error) {
        console.error('Error with buy now:', error);
        setButtonLoadingState(button, false);
        showError('Error processing your request. Please try again.');
      }
    } else {
      // Fallback: use fetch API
      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', 1);

      fetch('/cart/add', {
        method: 'POST',
        body: formData,
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          // Redirect to checkout after successful add
          window.location.href = '/checkout';
        })
        .catch(error => {
          console.error('Error with buy now:', error);
          setButtonLoadingState(button, false);
          showError('Error adding product to cart. Please try again.');
        });
    }
  }

  function setButtonLoadingState(button, isLoading) {
    const span = button.querySelector('span');
    const spinner = button.querySelector('.loading-overlay__spinner');

    if (isLoading) {
      button.dataset.originalText = span.textContent;
      button.disabled = true;
      span.textContent = 'PROCESSING...';
      if (spinner) spinner.classList.remove('hidden');
    } else {
      button.disabled = false;
      span.textContent = button.dataset.originalText || 'BUY NOW';
      if (spinner) spinner.classList.add('hidden');
      delete button.dataset.originalText;
    }
  }

  function showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Update variant data when variant changes
  document.addEventListener('change', function(e) {
    if (e.target.name === 'id' && e.target.type === 'radio') {
      // Update all forms with new variant ID
      const allForms = document.querySelectorAll('form[data-type="add-to-cart-form"]');
      allForms.forEach(form => {
        const variantInput = form.querySelector('input[name="id"]');
        if (variantInput) {
          variantInput.value = e.target.value;
        }

        const buyNowButton = form.querySelector('.product-form__buy-now');
        if (buyNowButton) {
          buyNowButton.dataset.variantId = e.target.value;
        }
      });

      // Update stock urgency callout
      updateStockUrgencyCallout(e.target.value);
    }
  });

  function updateStockUrgencyCallout(variantId) {
    // Find the urgency callout container
    const urgencyContainer = document.querySelector('.product-stock-urgency');
    if (!urgencyContainer) return;

    // Fetch variant data to get inventory quantity
    fetch(`${window.location.origin}/variants/${variantId}.js`)
      .then(response => response.json())
      .then(variant => {
        const quantity = variant.inventory_quantity || 0;

        // Update urgency callout based on stock level
        if (quantity > 0 && quantity <= 20) {
          urgencyContainer.innerHTML = `<div class="stock-urgency-indicator">🔥 Low in stock - Only ${quantity} available</div>`;
        } else if (quantity > 20) {
          urgencyContainer.innerHTML = `<div class="stock-in-stock-indicator">In Stock</div>`;
        } else {
          urgencyContainer.innerHTML = ''; // Hide for out of stock
        }
      })
      .catch(error => {
        console.error('Error fetching variant data:', error);
      });
  }
});