


const HeroSection = () => {

    return (
        <div
            className="relative flex items-center justify-center md:w-1/2 w-full p-10 overflow-hidden min-h-screen"
            style={{
                backgroundImage: "url('/logo.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 ">
                {/* Animated Mesh Gradient Overlay */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-orange-400/20 animate-pulse"></div>
                </div>

                {/* Dynamic Geometric Shapes */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-300/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-blue-300/10 rounded-full blur-xl animate-pulse delay-2000"></div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center text-white max-w-2xl">
                {/* Enhanced Logo Section */}
                <div className="relative mb-12">
                    <div className="relative group">
                        <div className="w-30 h-30 mx-auto bg-white/80 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl transform transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                            <img
                                src="/dugong.png"
                                alt="Dugong"
                                className="w-24 h-24 object-contain drop-shadow-lg "
                            />

                        </div>
                    </div>
                </div>

                {/* Enhanced Technical Title */}
                <div className="mb-8 space-y-6">
                    <div className="relative">
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                            {/* Main Technology Part */}
                            <div className="mb-3">
                                <span className="inline-block bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                                    Standalone Object Recognition
                                </span>
                                <br />
                                <span className="inline-block bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
                                    and Monitoring Software
                                </span>
                            </div>

                            {/* Species Focus */}
                            <div className="mb-3">
                                <span className="inline-block text-2xl md:text-3xl lg:text-4xl">
                                    <span className="text-yellow-300 font-extrabold animate-pulse">(</span>
                                    <span className="bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-300 bg-clip-text text-transparent font-bold">
                                        Dugong
                                    </span>
                                    <span className="text-yellow-300 font-extrabold animate-pulse">)</span>
                                </span>
                            </div>

                        </h1>


                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;