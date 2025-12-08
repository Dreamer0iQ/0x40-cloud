import { useState } from 'react';
import { authService } from '../../services/authService';
import styles from './login.module.scss';
import DataPulseLoader from '../../elements/Logo/DataPulseLoader';

interface LoginProps {
    onAuthSuccess: () => void;
}

export default function Login({ onAuthSuccess }: LoginProps) {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Please enter a valid email address');
                    setLoading(false);
                    return;
                }

                if (username.length < 3) {
                    setError('Username must be at least 3 characters long');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    setError('Password must be at least 6 characters long');
                    setLoading(false);
                    return;
                }

                const response = await authService.register({
                    username,
                    email,
                    password,
                    confirm_password: confirmPassword,
                });

                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                onAuthSuccess();
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Please enter a valid email address');
                    setLoading(false);
                    return;
                }

                const response = await authService.login({
                    email,
                    password,
                });

                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                onAuthSuccess();
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.leftSide}>
                <div className={styles.leftContent}>
                    <h1 className={styles.logo}>0x40 cloud</h1>
                    <div className={styles.welcomeText}>
                        <h2>Welcome!</h2>
                        <p>
                            <span className={styles.bold}>Build, Create</span>
                            <span className={styles.light}>, and Innovate with cloud</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.rightSide}>
                <div className={styles.loginForm}>
                    <h3 className={styles.loginTitle}>{isRegister ? 'Register' : 'Login'}</h3>
                    
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="user01"
                                    required
                                />
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={isRegister ? "email@example.com" : "example123"}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.togglePassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="currentColor"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {isRegister && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className={styles.passwordWrapper}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className={styles.togglePassword}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="currentColor"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        <button type="submit" className={styles.loginButton} disabled={loading}>
                            {loading ? (
                                <span className={styles.loadingContainer}>
                                    <DataPulseLoader width={24} height={24} />
                                </span>
                            ) : (
                                <>
                                    {isRegister ? 'Sign up' : 'Login'}
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>Or</span>
                    </div>


                    <p className={styles.createAccount}>
                        {isRegister ? (
                            <>Already have account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>Login</a></>
                        ) : (
                            <>Don't have account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>Create Account</a></>
                        )}
                    </p>
                </div>

            </div>
        </div>
    );
}