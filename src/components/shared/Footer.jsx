import React from "react";

const Footer = () => {
    return (
            <footer className="bg-blue-900 text-white py-12 text-center">
                <div className="">
                    <div className="mb-6 flex flex-wrap justify-center gap-6 text-sm">
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            User guidelines
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            FAQ
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            Contact us
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            About us
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            Privacy policy
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            Terms of service
                        </a>
                    </div>
                    <div className="text-gray-400 text-xs mt-4">Copyright ©{ new Date().getFullYear() } Evoli management d.o.o.</div>
                </div>
            </footer>
    );
};

export default Footer;
