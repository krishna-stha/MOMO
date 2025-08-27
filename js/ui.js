/* start: js/ui.js */
let currentMenuItem = null;

// --- Menu Rendering ---
function renderMenuItems(menuData, filter = 'featured') {
    const container = document.querySelector('.box-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!menuData || menuData.length === 0) {
        container.innerHTML = '<p style="color: white; text-align: center;">Sorry, the menu could not be loaded.</p>';
        return;
    }

    // Apply the filter
    const filteredData = filter === 'featured' 
        ? menuData.filter(item => item.is_featured) 
        : menuData;

    if (filteredData.length === 0 && filter === 'featured') {
        // If no featured items, show all items as a fallback
        renderMenuItems(menuData, 'all');
        // Also update the active button visually
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        document.querySelector('.filter-btn[data-filter="featured"]').classList.remove('active');
        return;
    }
    
    filteredData.forEach(item => {
        const box = document.createElement('div');
        // Add 'unavailable' class if item is not available
        box.className = `box reveal ${!item.is_available ? 'unavailable' : ''}`;
        
        box.innerHTML = `
            ${item.is_featured ? '<span class="featured-badge">✨</span>' : ''}
            <img src="${item.imagePath}" alt="${item.name}" />
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <button class="btn" data-item-id="${item.id}" ${!item.is_available ? 'disabled' : ''}>
                ${!item.is_available ? 'Out of Stock' : 'Add to cart'}
            </button>
        `;
        container.appendChild(box);
    });
}

// --- General UI ---
function toggleMobileNav() {
    document.getElementById('mobile-nav-menu').classList.toggle('active');
}

function updateCartBadge(count) {
    const badge = document.getElementById('cart-badge');
    if (!badge) {
        console.error('Cart badge element not found!');
        return;
    }
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

function updateAuthStateUI(user) {
    if (user) {
        document.body.classList.add('user-logged-in');
    } else {
        document.body.classList.remove('user-logged-in');
    }
}


// --- Toast Notifications ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => { toast.remove(); });
    toast.appendChild(messageElement);
    toast.appendChild(closeButton);
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) { toast.remove(); } }, 5000);
}

// --- Modals ---
const modals = {
    item: document.getElementById('itemModal'),
    cart: document.getElementById('cartModal'),
    auth: document.getElementById('authModal'),
    profile: document.getElementById('profileModal'),
};

function openModal(modalName, data) {
    if (!modals[modalName]) return;
    if (modalName === 'item' && data) populateItemModal(data);
    if (modalName === 'cart' && data) renderCart(data);
    if (modalName === 'profile' && data) populateProfileModal(data);
    modals[modalName].style.display = 'block';
}

function closeModal(modalName) {
    if (modals[modalName]) {
        modals[modalName].style.display = 'none';
    }
}

// --- Item Modal Logic ---
function populateItemModal(item) {
    currentMenuItem = item;
    const modal = modals.item;
    modal.querySelector('.modal-img').src = item.modalImagePath;
    modal.querySelector('.modal-title').textContent = `Add ${item.name} to Cart`;

    const radioGroup = modal.querySelector('.radio-group');
    radioGroup.innerHTML = ''; // Clear previous fillings
    
    // Dynamically create radio buttons based on the prices object
    for (const filling in item.prices) {
        if (item.prices[filling] !== null && item.prices[filling] > 0) {
            const id = filling.toLowerCase();
            const div = document.createElement('div');
            div.innerHTML = `
                <input type="radio" id="${id}" name="filling" value="${filling}" required>
                <label for="${id}">${filling}</label>
            `;
            radioGroup.appendChild(div);
        }
    }

    // Select the first available filling by default
    if (radioGroup.querySelector('input')) {
        radioGroup.querySelector('input').checked = true;
    }
    
    document.getElementById('itemForm').reset();
    updateItemPrice();
}

function updateItemPrice() {
    if (!currentMenuItem) return;
    const qty = parseInt(document.getElementById('fquan').value, 10) || 0;
    const fillingInput = document.querySelector('#itemForm input[name="filling"]:checked');
    const priceDisplay = document.getElementById('total-price');
    if (!fillingInput || qty <= 0) {
        priceDisplay.textContent = 'Rs. 0';
        return;
    }
    const pricePerPlate = currentMenuItem.prices[fillingInput.value];
    priceDisplay.textContent = `Rs. ${qty * pricePerPlate}`;
}

// --- Cart Modal Logic (with CRUD) ---
function renderCart(cartItems) {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    let grandTotal = 0;
    if (cartItems.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('place-order-btn').style.display = 'none';
    } else {
        document.getElementById('place-order-btn').style.display = 'block';
        cartItems.forEach(item => {
            const itemTotal = item.quantity * item.pricePerPlate;
            grandTotal += itemTotal;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `<div class="cart-item-info"><strong>${item.name}</strong> (${item.filling})<br><small>Rs. ${itemTotal}</small></div><div class="cart-item-controls"><button class="quantity-btn" data-id="${item.id}" data-change="-1">-</button><span>${item.quantity}</span><button class="quantity-btn" data-id="${item.id}" data-change="1">+</button><button class="remove-item-btn" data-id="${item.id}">✖</button></div>`;
            container.appendChild(itemElement);
        });
    }
    document.getElementById('cart-grand-total').textContent = `Rs. ${grandTotal}`;
}

function renderOrderHistory(orders) {
    const container = document.getElementById('order-history-list');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>You have no past orders.</p>';
        return;
    }
    container.innerHTML = orders.map(order => {
        const statusClass = order.status.replace(/\s+/g, '-');
        return `
        <div class="order-history-item">
            <div class="order-item-header">
                <strong>Order #${order.order_id}</strong>
                <span>Status: <span class="status status-${statusClass}">${order.status}</span></span>
            </div>
            <div class="order-item-details">
                <span>Total: Rs. ${order.total_price}</span>
                <span>Placed on: ${new Date(order.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `}).join('');
}


// --- Profile Modal Logic ---

async function populateProfileModal(profile) { // Add async keyword
    const form = document.getElementById('profile-form');
    form.querySelector('#profile-name').value = profile?.name || '';
    form.querySelector('#profile-phone').value = profile?.phone || '';
    form.querySelector('#profile-address').value = profile?.delivery_address || '';
    
    // Fetch and render order history
    const userOrders = await fetchUserOrders(); // The new API call
    renderOrderHistory(userOrders); // The new render function
}

// --- Auth Modal & Form Helpers ---
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    displayFormError(loginForm, null);
    displayFormError(signupForm, null);
    if (tab === 'login') {
        loginForm.style.display = 'block'; signupForm.style.display = 'none';
        loginTab.classList.add('active'); signupTab.classList.remove('active');
    } else {
        loginForm.style.display = 'none'; signupForm.style.display = 'block';
        loginTab.classList.remove('active'); signupTab.classList.add('active');
    }
}

function setButtonLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading'); button.disabled = true;
        button.innerHTML = '<div class="spinner"></div>';
    } else {
        button.classList.remove('loading'); button.disabled = false;
        const originalText = button.dataset.originalText || 'Submit';
        button.innerHTML = `<span>${originalText}</span>`;
    }
}

function displayFormError(formElement, message) {
    const errorElement = formElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message || '';
        errorElement.style.display = message ? 'block' : 'none';
    }
}

// --- Scroll Reveal ---
function revealOnScroll() {
    const reveals = document.querySelectorAll(".reveal");
    for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const revealtop = reveals[i].getBoundingClientRect().top;
        const revealPoint = 100;
        if (revealtop < windowHeight - revealPoint) {
            reveals[i].classList.add("active");
        }
    }
}
/* end: js/ui.js */