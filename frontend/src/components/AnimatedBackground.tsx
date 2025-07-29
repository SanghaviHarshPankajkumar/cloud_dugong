const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0">
            {/* Ocean Gradient Base */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100"></div>

            {/* Floating Bubbles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={`bubble-${i}`}
                        className={`absolute rounded-full bg-gradient-to-t from-cyan-200/20 to-blue-200/40 animate-pulse ${i % 3 === 0 ? "w-3 h-3" : i % 3 === 1 ? "w-5 h-5" : "w-7 h-7"
                            }`}
                        style={{
                            left: `${10 + (i * 7) % 80}%`,
                            top: `${15 + (i * 11) % 70}%`,
                            animationDelay: `${i * 0.7}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Coral Pattern Background */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute top-10 left-10 w-20 h-20 bg-orange-400 rounded-full blur-xl animate-pulse"></div>
                <div
                    className="absolute top-40 right-10 w-32 h-32 bg-pink-400 rounded-full blur-xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                ></div>
                <div
                    className="absolute bottom-40 left-20 w-24 h-24 bg-purple-400 rounded-full blur-xl animate-pulse"
                    style={{ animationDelay: "2s" }}
                ></div>
                <div
                    className="absolute top-1/2 right-1/4 w-28 h-28 bg-red-400 rounded-full blur-xl animate-pulse"
                    style={{ animationDelay: "3s" }}
                ></div>
            </div>

            {/* Underwater Light Rays */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-cyan-300 to-transparent transform rotate-12 animate-pulse"></div>
                <div
                    className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-blue-300 to-transparent transform -rotate-6 animate-pulse"
                    style={{ animationDelay: "1.5s" }}
                ></div>
                <div
                    className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-teal-300 to-transparent transform rotate-8 animate-pulse"
                    style={{ animationDelay: "2.5s" }}
                ></div>
            </div>

            {/* Floating Kelp/Seaweed */}
            <div className="absolute inset-0 opacity-20">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={`kelp-${i}`}
                        className="absolute bg-gradient-to-t from-green-300 to-teal-300 rounded-full animate-pulse"
                        style={{
                            left: `${5 + i * 15}%`,
                            bottom: "0%",
                            width: "8px",
                            height: `${60 + i * 20}%`,
                            transform: `rotate(${-10 + i * 5}deg)`,
                            animationDelay: `${i * 0.8}s`,
                            animationDuration: `${4 + i * 0.5}s`
                        }}
                    />
                ))}
            </div>

            {/* Floating Marine Particles */}
            <div className="absolute inset-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={`particle-${i}`}
                        className="absolute w-1 h-1 bg-cyan-300 rounded-full opacity-40 animate-bounce"
                        style={{
                            left: `${5 + (i * 6) % 90}%`,
                            top: `${10 + (i * 7) % 80}%`,
                            animationDelay: `${i * 0.4}s`,
                            animationDuration: `${2 + (i % 3) * 0.5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Gentle Wave Effect */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-teal-200 to-transparent animate-pulse"></div>
                <div
                    className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-cyan-200 to-transparent animate-pulse"
                    style={{ animationDelay: "1s", animationDuration: "4s" }}
                ></div>
            </div>

            {/* Subtle Shimmer Effect */}
            <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={`shimmer-${i}`}
                        className="absolute w-2 h-2 bg-gradient-to-br from-white to-cyan-100 rounded-full opacity-30 animate-pulse"
                        style={{
                            left: `${15 + (i * 12) % 70}%`,
                            top: `${20 + (i * 9) % 60}%`,
                            animationDelay: `${i * 0.6}s`,
                            animationDuration: `${3 + (i % 2) * 0.5}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default AnimatedBackground;