import { createIcons } from 'lucide';
import { APP_ICONS } from '../utils/icons.js';
import { login, register, logout, isLoggedIn, getCurrentUser } from '../api/auth.js';

export function renderHeader(container) {
    container.innerHTML = `
        <header id="main-header" class="flex items-center justify-between gap-6 px-6 py-4 w-full bg-[#FFFDF7] shadow-[0_1px_4px_rgb(103_85_22/12%)] sticky top-0 z-20">
            <h1 class="text-[#675516] text-xl font-bold shrink-0">BONYAN</h1>
            <nav>
                <ul class="flex gap-6 text-[#524310]">
                    <li><a href="/home" data-link class="transition duration-300 hover:scale-105 inline-block">Home</a></li>
                    <li><a href="/wedding" data-link class="transition duration-300 hover:scale-105 inline-block">Unique Wedding</a></li>
                    <li><a href="/fashion" data-link class="transition duration-300 hover:scale-105 inline-block">Fashion Home</a></li>
                    <li><a href="/budget" data-link class="transition duration-300 hover:scale-105 inline-block">Budget Plan</a></li>
                </ul>
            </nav>
            <div class="flex items-center gap-4 ml-auto min-w-0">
                <div class="relative hidden lg:block w-[min(22rem,36vw)] shrink-0">
                    <input
                        type="search"
                        placeholder="What are you looking for?"
                        aria-label="Search"
                        class="w-full h-10 pl-4 pr-11 rounded-md border border-[#D6C284] bg-[#FFFDF7] text-[#675516] placeholder:text-[#675516]/45 outline-none focus:border-[#C0A245]"
                    />
                    <span class="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center w-6 h-6 pointer-events-none">
                        <i data-lucide="search" class="w-4.5 h-4.5"></i>
                    </span>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                    <div class="relative">
                        <button
                            type="button"
                            id="auth-toggle"
                            class="inline-flex items-center justify-center text-[#675516] transition duration-300 hover:scale-105"
                            aria-expanded="false"
                            aria-controls="auth-dropdown"
                            aria-label="Account"
                        >
                            <i data-lucide="user"></i>
                        </button>
                        <div id="auth-dropdown" class="absolute top-[calc(100%+0.75rem)] right-0 w-[min(22rem,90vw)] p-6 rounded-2xl bg-white shadow-[0_8px_24px_rgb(103_85_22/12%)] border border-[#D6C284] z-30" hidden>
                            <div id="auth-login-panel" class="flex flex-col">
                                <h2 class="text-xl font-semibold text-[#675516] text-center">Welcome Back</h2>
                                <p class="mt-2 mb-4 text-[0.95rem] text-black/60 text-center">Sign in to access your Bonyan account</p>
                                <p id="login-error" class="text-sm text-red-700 text-center mb-2" hidden></p>
                                <form id="auth-login-form" class="flex flex-col gap-3.5">
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Email address</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="mail" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="email" name="email" placeholder="Email Address" autocomplete="email" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Password</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="lock" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="password" name="password" placeholder="Password" autocomplete="current-password" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <button type="submit" class="mt-1 w-full py-2.5 rounded-full bg-[#C0A245] text-white font-semibold transition duration-300 hover:bg-[#9B864A]">Sign In</button>
                                </form>
                                <p class="mt-4 text-[0.95rem] text-[#524310] text-center">
                                    Don't have an account?
                                    <button type="button" data-auth-mode="register" class="text-[#B26262] font-medium hover:underline">Register</button>
                                </p>
                            </div>
                            <div id="auth-register-panel" class="flex flex-col" hidden>
                                <h2 class="text-xl font-semibold text-[#675516] text-center">Create Your Account</h2>
                                <p class="mt-2 mb-4 text-[0.95rem] text-black/60 text-center">Sign up and get access for free</p>
                                <p id="register-error" class="text-sm text-red-700 text-center mb-2" hidden></p>
                                <form id="auth-register-form" class="flex flex-col gap-3.5">
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Full name</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="user" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="text" name="name" placeholder="Full Name" autocomplete="name" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Email address</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="mail" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="email" name="email" placeholder="Email Address" autocomplete="email" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Password</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="lock" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="password" name="password" placeholder="Password" autocomplete="new-password" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-[#524310]">Confirm password</span>
                                        <span class="relative flex items-center">
                                            <i data-lucide="lock" class="absolute left-3.5 w-4 h-4 stroke-black/60 pointer-events-none"></i>
                                            <input type="password" name="confirmPassword" placeholder="Confirm password" autocomplete="new-password" required
                                                class="w-full py-2.5 pl-10 pr-3.5 rounded-full border border-transparent bg-[#FFFCEF] text-[#675516] placeholder:text-black/60 outline-none focus:border-[#C0A245]" />
                                        </span>
                                    </label>
                                    <button type="submit" class="mt-1 w-full py-2.5 rounded-full bg-[#C0A245] text-white font-semibold transition duration-300 hover:bg-[#9B864A]">Sign Up</button>
                                </form>
                                <p class="mt-4 text-[0.95rem] text-[#524310] text-center">
                                    Already have an account?
                                    <button type="button" data-auth-mode="login" class="text-[#B26262] font-medium hover:underline">Sign In</button>
                                </p>
                            </div>
                            <div id="auth-account-panel" class="flex flex-col" hidden>
                                <h2 id="account-name" class="text-xl font-semibold text-[#675516] text-center">Hi</h2>
                                <p id="account-email" class="mt-2 mb-4 text-[0.95rem] text-black/60 text-center"></p>
                                <button type="button" id="logout-btn" class="w-full py-2.5 rounded-full bg-[#C0A245] text-white font-semibold transition duration-300 hover:bg-[#9B864A]">Log Out</button>
                            </div>
                        </div>
                    </div>
                    <a href="/chatbot" data-link aria-label="Chatbot" class="inline-flex items-center justify-center text-[#675516] transition duration-300 hover:scale-105"><i data-lucide="bot-message-square"></i></a>
                    <a href="/cart" data-link aria-label="Cart" class="inline-flex items-center justify-center text-[#675516] transition duration-300 hover:scale-105"><i data-lucide="shopping-basket"></i></a>
                </div>
            </div>
        </header>
    `;
}

export function initHeader() {
    createIcons({ icons: APP_ICONS });

    const authToggle = document.getElementById('auth-toggle');
    const authDropdown = document.getElementById('auth-dropdown');
    const loginPanel = document.getElementById('auth-login-panel');
    const registerPanel = document.getElementById('auth-register-panel');
    const accountPanel = document.getElementById('auth-account-panel');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    if (!authToggle || !authDropdown) return;

    const showError = (el, message) => {
        el.textContent = message;
        el.hidden = false;
    };
    const clearError = (el) => {
        el.hidden = true;
        el.textContent = '';
    };

    const setPanel = (mode) => {
        loginPanel.hidden = mode !== 'login';
        registerPanel.hidden = mode !== 'register';
        accountPanel.hidden = mode !== 'account';
    };

    const refreshAuthUI = () => {
        if (isLoggedIn()) {
            const user = getCurrentUser();
            document.getElementById('account-name').textContent = `Hi, ${user?.name ?? ''}`;
            document.getElementById('account-email').textContent = user?.email ?? '';
            setPanel('account');
        } else {
            setPanel('login');
        }
    };

    const closeDropdown = () => {
        authDropdown.hidden = true;
        authToggle.setAttribute('aria-expanded', 'false');
    };

    const openDropdown = () => {
        refreshAuthUI();
        authDropdown.hidden = false;
        authToggle.setAttribute('aria-expanded', 'true');
        createIcons({ icons: APP_ICONS });
    };

    authToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = authToggle.getAttribute('aria-expanded') === 'true';
        isOpen ? closeDropdown() : openDropdown();
    });

    authDropdown.querySelectorAll('[data-auth-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
            clearError(loginError);
            clearError(registerError);
            setPanel(btn.dataset.authMode);
        });
    });

    document.getElementById('auth-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(loginError);
        const form = new FormData(e.target);
        try {
            await login(form.get('email'), form.get('password'));
            closeDropdown();
        } catch (err) {
            showError(loginError, err.message);
        }
    });

    document.getElementById('auth-register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(registerError);
        const form = new FormData(e.target);
        if (form.get('password') !== form.get('confirmPassword')) {
            showError(registerError, "Passwords don't match");
            return;
        }
        try {
            await register(form.get('name'), form.get('email'), form.get('password'));
            closeDropdown();
        } catch (err) {
            showError(registerError, err.message);
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await logout();
        setPanel('login');
    });

    document.addEventListener('click', (e) => {
        if (!authDropdown.hidden && !e.target.closest('.header-auth, #auth-dropdown, #auth-toggle')) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !authDropdown.hidden) {
            closeDropdown();
        }
    });
}