/**
 * Fetches the menu data from the Supabase database.
 * Only retrieves items that are marked as available.
 * Sorts the results to show featured items first.
 * @returns {Promise<Array>} A promise that resolves to the menu data array.
 */
async function fetchMenuData() {
    try {
        const { data, error } = await supabaseClient
            .from('menu_items')
            .select('*')
            .eq('is_available', true) // Only get items that are in stock
            .order('is_featured', { ascending: false }) // Featured items first
            .order('id', { ascending: true }); // Then sort by creation order

        if (error) {
            throw error;
        }
        return data;
    } catch (error) {
        console.error("Could not fetch menu data from Supabase:", error);
        return []; // Return an empty array on failure to prevent crashes
    }
}

/**
 * Updates a user's profile data in the users table.
 * @param {string} userId - The UUID of the user.
 * @param {object} profileData - The data to update (e.g., { name, phone, delivery_address }).
 * @returns {Promise<object>} The updated data.
 */
async function updateUserProfile(userId, profileData) {
    const { data, error } = await supabaseClient
        .from('users')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single(); // return the updated profile
    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
    return data;
}

/**
 * Submits a completed order to the product_placement table.
 * @param {object} orderData - The complete order object.
 * @returns {Promise<object>} The result of the submission.
 */
async function submitOrder(orderData) {
    const { data, error } = await supabaseClient
        .from('product_placement')
        .insert([orderData]);
    if (error) {
        console.error('Error submitting order:', error);
        throw error;
    }
    return data;
}

/**
 * Deletes the currently authenticated user by invoking a secure Supabase Edge Function.
 * @returns {Promise<object>} The result of the function invocation.
 */
async function deleteUser() {
    // We invoke a server-side Edge Function to perform the deletion securely.
    const { data, error } = await supabaseClient.functions.invoke('delete-user', {
        method: 'POST',
    });

    if (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
    
    // After successful deletion, sign the user out locally.
    await supabaseClient.auth.signOut();
    window.location.reload();

    return data;
}

async function fetchUserOrders() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return []; // Not logged in, so no orders to fetch.

    try {
        const { data, error } = await supabaseClient
            .from('product_placement')
            .select('*')
            .eq('user_id', user.id) // Securely fetch only the current user's orders
            .order('created_at', { ascending: false }); // Show newest orders first
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Could not fetch user orders:", error);
        return [];
    }
}