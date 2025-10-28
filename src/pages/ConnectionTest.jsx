import React, { useState, useEffect } from "react";
import apiClient from "../services/apiClient";

export default function ConnectionTest() {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);

    const testConnection = async () => {
        setLoading(true);
        const testResults = {};

        // Test 1: Basic connectivity
        try {
            const response = await fetch(import.meta.env.VITE_API_BASE_URL.replace('/api', '/docs'), {
                method: 'GET',
                mode: 'no-cors' // Just to test if server is reachable
            });
            testResults.basicConnectivity = "✅ Server reachable";
        } catch (error) {
            testResults.basicConnectivity = `❌ Server unreachable: ${error.message}`;
        }

        // Test 2: CORS preflight
        try {
            const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/auth/login', {
                method: 'OPTIONS',
                headers: {
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            testResults.cors = `✅ CORS preflight: ${response.status}`;
        } catch (error) {
            testResults.cors = `❌ CORS issue: ${error.message}`;
        }

        // Test 3: Actual API call
        try {
            const response = await apiClient.post('/auth/login', {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
            testResults.apiCall = `✅ API reachable: ${response.status}`;
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 401) {
                testResults.apiCall = `✅ API reachable (expected auth error): ${error.response.status}`;
            } else {
                testResults.apiCall = `❌ API error: ${error.response?.status || error.message}`;
            }
        }

        // Test 4: Environment check
        testResults.environment = {
            currentOrigin: window.location.origin,
            apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
            isDev: import.meta.env.DEV,
            mode: import.meta.env.MODE
        };

        setResults(testResults);
        setLoading(false);
    };

    useEffect(() => {
        testConnection();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Connection Test</h1>
                
                <button 
                    onClick={testConnection}
                    disabled={loading}
                    className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Run Tests'}
                </button>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
                        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                            {JSON.stringify(results.environment, null, 2)}
                        </pre>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Connection Tests</h2>
                        <div className="space-y-2">
                            <div>
                                <strong>Basic Connectivity:</strong> {results.basicConnectivity || 'Not tested'}
                            </div>
                            <div>
                                <strong>CORS:</strong> {results.cors || 'Not tested'}
                            </div>
                            <div>
                                <strong>API Call:</strong> {results.apiCall || 'Not tested'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Full Results</h2>
                        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}