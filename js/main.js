/* start: js/main.js */
// This is the entry point of our application. It waits for the HTML to be fully loaded.
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await initDB(); 
    setupEventListeners();
    onAuthStateChange(handleUserSession);
    await loadMenu(); // Await to ensure menuData is available
    updateCartUI();
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();
}

let currentUser = null;
let orderSubscription = null;
let menuData = []; // Store menu data globally

async function handleUserSession(session) {
    if (session && session.user) {
        const { data: profile, error } = await supabaseClient.from('users').select('*').eq('id', session.user.id).single();
        if (error) { console.error("Error fetching user profile:", error); currentUser = null; } 
        else { currentUser = profile; }
        subscribeToOrderUpdates(session.user.id);
    } else {
        currentUser = null;
        if (orderSubscription) {
            orderSubscription.unsubscribe();
            orderSubscription = null;
        }
    }
    updateAuthStateUI(currentUser);
}

async function loadMenu() {
    menuData = await fetchMenuData(); // Fetch and store in the global variable
    renderMenuItems(menuData, 'featured'); // Render with default filter
}

async function updateCartUI() {
    const cartItems = await getCart();
    updateCartBadge(cartItems.length);
}

function setupEventListeners() {
    // Navbar controls
    document.getElementById('hamburger-btn').addEventListener('click', toggleMobileNav);
    document.getElementById('cart-icon').addEventListener('click', async (e) => { e.preventDefault(); const cartItems = await getCart(); openModal('cart', cartItems); });
    document.getElementById('logout-link-desktop').addEventListener('click', async (e) => { e.preventDefault(); await signOut(); });
    document.getElementById('profile-icon').addEventListener('click', async (e) => { e.preventDefault(); if (!currentUser) return; const indexedDbProfile = await getProfile(); openModal('profile', { ...currentUser, ...indexedDbProfile }); });
    
    // Login functionality for both desktop and mobile
    document.getElementById('login-link').addEventListener('click', (e) => { e.preventDefault(); openModal('auth'); });
    document.getElementById('login-link-mobile').addEventListener('click', (e) => { e.preventDefault(); openModal('auth'); toggleMobileNav(); });

    // Mobile navigation links
    const mobileNav = document.getElementById('mobile-nav-menu');
    mobileNav.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const linkId = link.id;

        // Links that just navigate should close the menu
        if (link.getAttribute('href')?.startsWith('#')) {
            if (document.getElementById('mobile-nav-menu').classList.contains('active')) {
                toggleMobileNav();
            }
        }
        
        // Handle specific actions
        if (linkId === 'logout-link') { 
            e.preventDefault(); 
            await signOut(); 
        } else if (linkId === 'profile-link-mobile') { 
            e.preventDefault(); 
            if (!currentUser) return; 
            const indexedDbProfile = await getProfile(); 
            openModal('profile', { ...currentUser, ...indexedDbProfile }); 
            toggleMobileNav();
        }
    });

    // NEW: Menu Filter Event Listener
    document.querySelector('.menu-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.filter;
            renderMenuItems(menuData, filter);
            revealOnScroll(); // Re-run reveal check after re-rendering
        }
    });

    // Modal controls
    document.querySelectorAll('.modal .close').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
    window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
    
    // Add to cart button on menu items
    document.querySelector('.box-container').addEventListener('click', async (e) => {
        const button = e.target.closest('.btn');
        if (button && !button.disabled) {
            const itemId = button.dataset.itemId;
            const selectedItem = menuData.find(item => item.id == itemId); // Use '==' for type coercion as id from db is number
            if (selectedItem) openModal('item', selectedItem);
        }
    });

    // Item modal form (Add to Cart)
    const itemForm = document.getElementById('itemForm');
    itemForm.addEventListener('input', updateItemPrice);
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(itemForm);
        const filling = formData.get('filling');
        const quantity = parseInt(formData.get('quantity'), 10);
        const pricePerPlate = currentMenuItem.prices[filling];
        await addItemToCart({ itemId: currentMenuItem.id, name: currentMenuItem.name, filling, quantity, pricePerPlate });
        updateCartUI();
        closeModal('item');
        showToast(`${currentMenuItem.name} added to cart!`, 'success');
    });

    // Cart controls (quantity, remove)
    document.getElementById('cart-items-container').addEventListener('click', async (e) => {
        const cartItems = await getCart();
        const target = e.target;
        const id = parseInt(target.dataset.id, 10);
        if (target.classList.contains('quantity-btn')) {
            const change = parseInt(target.dataset.change, 10);
            const item = cartItems.find(i => i.id === id);
            if (item) { const newQuantity = item.quantity + change; if (newQuantity > 0) { await updateCartItem(id, newQuantity); } else { await deleteCartItem(id); } }
        } else if (target.classList.contains('remove-item-btn')) { await deleteCartItem(id); }
        const updatedCart = await getCart();
        renderCart(updatedCart);
        updateCartBadge(updatedCart.length);
    });

    // Place Order button
    document.getElementById('place-order-btn').addEventListener('click', async () => {
        if (!currentUser) { showToast('Please sign in to place an order.', 'error'); closeModal('cart'); openModal('auth'); return; }
        if (!currentUser.delivery_address || !currentUser.phone) { showToast('Please complete your profile (phone & address).', 'error'); closeModal('cart'); openModal('profile', currentUser); return; }
        const cartItems = await getCart();
        if (cartItems.length === 0) { return showToast('Your cart is empty.', 'info'); }
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.quantity * item.pricePerPlate), 0);
        const orderData = { user_id: currentUser.id, customer_name: currentUser.name, customer_phone: currentUser.phone, delivery_address: currentUser.delivery_address, total_price: totalPrice, items: cartItems };
        try { await submitOrder(orderData); await clearCart(); updateCartUI(); closeModal('cart'); showToast('Order placed successfully!', 'success'); } catch (error) { showToast('Failed to place order. Please try again.', 'error'); }
    });

    // Auth forms (Login/Signup)
    document.getElementById('login-tab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('signup-tab').addEventListener('click', () => switchAuthTab('signup'));
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const submitBtn = loginForm.querySelector('.submit-btn'); submitBtn.dataset.originalText = 'Login'; displayFormError(loginForm, null); setButtonLoadingState(submitBtn, true); try { const { email, password } = Object.fromEntries(new FormData(e.target)); await signIn(email, password); closeModal('auth'); showToast(`Welcome back!`, 'success'); } catch (error) { displayFormError(loginForm, error.message); } finally { setButtonLoadingState(submitBtn, false); } });
    const signupForm = document.getElementById('signup-form');
    signupForm.addEventListener('submit', async (e) => { e.preventDefault(); const submitBtn = signupForm.querySelector('.submit-btn'); submitBtn.dataset.originalText = 'Sign Up'; displayFormError(signupForm, null); setButtonLoadingState(submitBtn, true); try { const formData = Object.fromEntries(new FormData(e.target)); await signUp(formData); closeModal('auth'); showToast('Signed up successfully! Welcome!', 'success'); } catch (error) { displayFormError(signupForm, error.message); } finally { setButtonLoadingState(submitBtn, false); } });
    
    // Profile form
    document.getElementById('change-pic-btn').addEventListener('click', () => document.getElementById('profile-pic-upload').click());
    document.getElementById('profile-pic-upload').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; document.getElementById('profile-pic-preview').src = URL.createObjectURL(file); const profile = await getProfile() || {}; profile.picture = file; await saveProfile(profile); });
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => { e.preventDefault(); const submitBtn = profileForm.querySelector('.submit-btn'); submitBtn.dataset.originalText = 'Save Profile'; setButtonLoadingState(submitBtn, true); try { const formData = Object.fromEntries(new FormData(e.target)); await updateUserProfile(currentUser.id, formData); currentUser = { ...currentUser, ...formData }; showToast('Profile updated successfully!', 'success'); closeModal('profile'); } catch (error) { showToast('Failed to update profile.', 'error'); } finally { setButtonLoadingState(submitBtn, false); } });
    document.getElementById('delete-account-btn').addEventListener('click', async () => { if (confirm('Are you sure you want to permanently delete your account?')) { try { await deleteUser(); showToast('Account deleted successfully.', 'info'); } catch (error) { showToast(`Failed to delete account: ${error.message}`, 'error'); } } });
}

function subscribeToOrderUpdates(userId) {
    if (orderSubscription) orderSubscription.unsubscribe();

    orderSubscription = supabaseClient
        .channel(`user-orders-${userId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'product_placement',
            filter: `user_id=eq.${userId}`
        }, async (payload) => { // *** Made this function async ***
            const updatedOrder = payload.new;
            let message = '';
            
            // Create a user-friendly message for each status
            switch (updatedOrder.status) {
                case 'Confirmed':
                    message = `🎉 Your order #${updatedOrder.order_id} has been confirmed!`;
                    showToast(message, 'success');
                    break;
                case 'Cooking':
                    message = `🍳 We've started preparing your order #${updatedOrder.order_id}.`;
                    showToast(message, 'info');
                    break;
                case 'Out for Delivery':
                    message = `🚚 Your order #${updatedOrder.order_id} is on its way!`;
                    showToast(message, 'info');
                    break;
                case 'Delivered':
                    message = `✅ Your order #${updatedOrder.order_id} has been delivered. Enjoy!`;
                    showToast(message, 'success');
                    break;
                case 'Cancelled':
                    message = `❌ Your order #${updatedOrder.order_id} has been cancelled.`;
                    showToast(message, 'error');
                    break;
                case 'Failed':
                    message = `❗️ Delivery for order #${updatedOrder.order_id} failed. Please contact us.`;
                    showToast(message, 'error');
                    break;
            }

            // *** FIX ADDED HERE ***
            // After showing the toast, check if the profile modal is currently open.
            // If it is, refresh the order history list to show the new status instantly.
            const profileModal = document.getElementById('profileModal');
            if (profileModal && profileModal.style.display === 'block') {
                const updatedOrders = await fetchUserOrders();
                renderOrderHistory(updatedOrders);
            }
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') console.log(`Successfully subscribed to live order updates for user ${userId}!`);
            if (status === 'CHANNEL_ERROR') console.error('Subscription Error:', err);
        });
}
/* end: js/main.js */