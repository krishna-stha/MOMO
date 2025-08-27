/**
 * Signs up a new user using Supabase Auth.
 * Additional profile data is passed in the 'options.data' object.
 * @param {object} profileData - Contains email, password, and other metadata like name, phone, etc.
 * @returns {Promise<object>} The user object from the session.
 */
async function signUp(profileData) {
    const { email, password, ...metaData } = profileData;

    // Separate metadata from auth credentials
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: metaData // This data will be available to the SQL trigger
        }
    });

    if (error) {
        console.error("Sign up error:", error.message);
        throw new Error(error.message);
    }
    if (!data.user) {
        throw new Error("Signup successful, but no user data returned. Please check your email for verification if enabled.");
    }
    
    // The SQL trigger will handle creating the public.users profile.
    return data.user;
}

/**
 * Signs in a user using Supabase Auth.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} The user object from the session.
 */
async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Sign in error:", error.message);
        throw new Error(error.message);
    }
    
    return data.user;
}

/**
 * Signs out the current user.
 */
async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Sign out error:", error.message);
        throw error;
    }
    // Reload the page to reset the application state.
    window.location.reload();
}

/**
 * Sets up a listener that triggers a callback whenever the user's auth state changes.
 * @param {function} callback - The function to call with the session object (or null).
 */
function onAuthStateChange(callback) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(session);
    });
}