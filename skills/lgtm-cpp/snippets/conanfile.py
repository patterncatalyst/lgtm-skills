# Conan 2 recipe for an lgtm-cpp project.
# Pins every dependency exactly and generates the CMake toolchain + dep configs.
#
#   conan install . --output-folder=build --build=missing -s build_type=Debug
#
# Survey the latest stable before pinning a __PINNED__ placeholder:
#   conan search spdlog -r conancenter
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMakeDeps, cmake_layout


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

    def layout(self):
        cmake_layout(self)

    def generate(self):
        # CMakeToolchain -> conan_toolchain.cmake (compiler, cppstd, build type).
        tc = CMakeToolchain(self, generator="Ninja")
        tc.generate()
        # CMakeDeps -> <Pkg>Config.cmake so find_package(GTest|spdlog|...) resolves.
        CMakeDeps(self).generate()
