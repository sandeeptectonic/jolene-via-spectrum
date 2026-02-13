if (!customElements.get('pair-it-with-section')) {
  customElements.define(
    'pair-it-with-section',
    class PairItWithSection extends HTMLElement {
      constructor() {
        super();

        this.checkboxes = this.querySelectorAll('.pair-it-with__input');
        this.selects = this.querySelectorAll('.pair-it-with__select');
        this.atcBtn = this.querySelector('.pair-it-with__atc-btn');
        this.countEl = this.querySelector('.pair-it-with__count');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

        this.checkboxes.forEach((cb) => {
          cb.addEventListener('change', this.onCheckboxChange.bind(this));
        });

        this.selects.forEach((select) => {
          select.addEventListener('change', this.onVariantChange.bind(this));
        });

        if (this.atcBtn) {
          this.atcBtn.addEventListener('click', this.onAddToCart.bind(this));
        }
      }

      onCheckboxChange(e) {
        const item = e.target.closest('.pair-it-with__item');
        item.classList.toggle('is-unchecked', !e.target.checked);
        this.updateCount();
      }

      updateCount() {
        const checked = this.querySelectorAll('.pair-it-with__input:checked').length;
        if (this.countEl) this.countEl.textContent = checked;
        if (this.atcBtn) this.atcBtn.disabled = checked === 0;
      }

      onVariantChange(e) {
        const select = e.target;
        const option = select.selectedOptions[0];
        const index = select.dataset.productIndex;
        const item = select.closest('.pair-it-with__item');
        const priceRow = this.querySelector(
          '.pair-it-with__price-row[data-product-index="' + index + '"]'
        );

        // Update variant ID on item
        if (item) item.dataset.variantId = select.value;
        if (!priceRow || !option) return;

        const salePriceEl = priceRow.querySelector('.pair-it-with__sale-price');
        let comparePriceEl = priceRow.querySelector('.pair-it-with__compare-price');
        let discountEl = priceRow.querySelector('.pair-it-with__discount');

        const priceRaw = parseInt(option.dataset.priceRaw, 10);
        const compareRaw = parseInt(option.dataset.compareRaw, 10);

        // Update sale price
        if (salePriceEl) salePriceEl.textContent = option.dataset.price;

        if (compareRaw > priceRaw) {
          var discountPct = Math.round(((compareRaw - priceRaw) * 100) / compareRaw);

          if (comparePriceEl) {
            comparePriceEl.textContent = option.dataset.comparePrice;
            comparePriceEl.style.display = '';
          } else {
            comparePriceEl = document.createElement('s');
            comparePriceEl.className = 'pair-it-with__compare-price';
            comparePriceEl.textContent = option.dataset.comparePrice;
            salePriceEl.after(comparePriceEl);
          }

          if (discountEl) {
            discountEl.textContent = discountPct + '% OFF';
            discountEl.style.display = '';
          } else {
            discountEl = document.createElement('span');
            discountEl.className = 'pair-it-with__discount';
            discountEl.textContent = discountPct + '% OFF';
            comparePriceEl.after(discountEl);
          }
        } else {
          if (comparePriceEl) comparePriceEl.style.display = 'none';
          if (discountEl) discountEl.style.display = 'none';
        }
      }

      onAddToCart() {
        var checkedItems = this.querySelectorAll('.pair-it-with__input:checked');
        if (checkedItems.length === 0) return;

        var items = [];
        checkedItems.forEach(function (cb) {
          var item = cb.closest('.pair-it-with__item');
          var variantId = parseInt(item.dataset.variantId, 10);
          if (variantId) {
            items.push({ id: variantId, quantity: 1 });
          }
        });

        if (items.length === 0) return;

        this.atcBtn.classList.add('loading');
        this.atcBtn.setAttribute('aria-disabled', 'true');

        var body = { items: items };
        var self = this;

        if (this.cart) {
          body.sections = this.cart.getSectionsToRender().map(function (section) {
            return section.id;
          });
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        fetch(routes.cart_add_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/javascript',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(body),
        })
          .then(function (response) {
            return response.json();
          })
          .then(function (response) {
            if (response.status) {
              console.error('Pair it with: cart error', response.description || response.message);
              return;
            }

            if (self.cart) {
              self.cart.renderContents(response);
            } else {
              window.location = routes.cart_url;
            }

            if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'pair-it-with',
                productVariantId: items[0].id,
              });
            }
          })
          .catch(function (error) {
            console.error('Pair it with: fetch error', error);
          })
          .finally(function () {
            self.atcBtn.classList.remove('loading');
            self.atcBtn.removeAttribute('aria-disabled');
            if (self.cart && self.cart.classList.contains('is-empty')) {
              self.cart.classList.remove('is-empty');
            }
          });
      }
    }
  );
}
