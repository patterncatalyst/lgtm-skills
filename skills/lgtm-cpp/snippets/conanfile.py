# Conan 2 recipe for an lgtm-cpp project.
# Pins every dependency exactly and generates the CMake toolchain + dep configs.
#
#   conan install . --output-folder=build --build=missing -s build_type=Debug
#
# Survey the latest stable before pinning a __PINNED__ placeholder:
#   conan search spdlog -r conancenter
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMakeDeps


class ShippingDemoConan(ConanFile):
    settings = "os", "compiler", "build_type", "arch"

    def requirements(self):
        # GoogleTest + GoogleMock. 1.18 depends on Abseil; Conan pins Abseil
        # (and RE2) transitively, so there is nothing to manage by hand.
        self.requires("gtest/1.18.0")

        # Structured logging (console + rotating file) for Claude diagnosis.
        # Survey + pin: conan search spdlog -r conancenter
        self.requires("spdlog/__PINNED__")

        # Add per project, each pinned exactly (never a version range):
        # self.requires("nlohmann_json/__PINNED__")
        # self.requires("boost/__PINNED__")        # latest Boost only; NOT Boost.Test
        # self.requires("lua/5.5.1")               # companion scripting
        # self.requires("sol2/__PINNED__")         # C++ <-> Lua binding
        # self.requires("opentelemetry-cpp/__PINNED__")

    def generate(self):
        # No cmake_layout: with `conan install . -of build`, the toolchain and dep
        # configs land flat in build/, which is where CMakePresets.json's
        # toolchainFile (build/conan_toolchain.cmake) looks for them. cmake_layout
        # would nest them under build/<build_type>/generators/ and break the preset.
        #
        # CMakeToolchain -> conan_toolchain.cmake (compiler, cppstd, build type).
        tc = CMakeToolchain(self, generator="Ninja")
        tc.generate()
        # CMakeDeps -> <Pkg>Config.cmake so find_package(GTest|spdlog|...) resolves.
        CMakeDeps(self).generate()
