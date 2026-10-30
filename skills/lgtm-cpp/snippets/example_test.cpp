// GoogleTest + GoogleMock example against a small shipping-domain seam.
// Shows a plain unit test, a parameterized test, and mocking an interface —
// the shape used to test design patterns (Strategy / Observer / Decorator),
// where the pattern's collaborator is a mockable seam.
//
// Build + run through CTest:
//   ctest --preset default --output-on-failure
#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <string>
#include <string_view>
#include <vector>

using ::testing::Return;

namespace shipping {

// Value type under test.
class RateQuote {
public:
    explicit RateQuote(std::vector<int> line_items) : line_items_(std::move(line_items)) {}
    [[nodiscard]] int total() const {
        int sum = 0;
        for (int item : line_items_) {
            sum += item;
        }
        return sum;
    }

private:
    std::vector<int> line_items_;
};

// A mockable seam: the Strategy a Booking delegates carrier pricing to.
class CarrierGateway {
public:
    CarrierGateway() = default;
    CarrierGateway(const CarrierGateway&) = delete;
    CarrierGateway& operator=(const CarrierGateway&) = delete;
    CarrierGateway(CarrierGateway&&) = delete;
    CarrierGateway& operator=(CarrierGateway&&) = delete;
    virtual ~CarrierGateway() = default;
    virtual int quote(std::string_view carrier, int weight) = 0;
};

class Booking {
public:
    explicit Booking(CarrierGateway& gateway) : gateway_(gateway) {}
    [[nodiscard]] int cheapest_quote(int weight) {
        int acme = gateway_.quote("acme", weight);
        int globex = gateway_.quote("globex", weight);
        return acme < globex ? acme : globex;
    }

private:
    CarrierGateway& gateway_;
};

} // namespace shipping

// ── Plain unit test ───────────────────────────────────────────────────────────
TEST(RateQuote, SumsLineItems) {
    shipping::RateQuote quote{{2, 3}};
    EXPECT_EQ(quote.total(), 5);
}

// ── Parameterized test ────────────────────────────────────────────────────────
class RateQuoteParam : public ::testing::TestWithParam<std::pair<std::vector<int>, int>> {};

TEST_P(RateQuoteParam, TotalsCorrectly) {
    const auto& [items, expected] = GetParam();
    EXPECT_EQ(shipping::RateQuote(items).total(), expected);
}

INSTANTIATE_TEST_SUITE_P(Totals, RateQuoteParam,
    ::testing::Values(std::pair{std::vector<int>{}, 0},
                      std::pair{std::vector<int>{5}, 5},
                      std::pair{std::vector<int>{2, 3, 4}, 9}));

// ── GoogleMock: testing a Strategy seam ───────────────────────────────────────
class MockCarrierGateway : public shipping::CarrierGateway {
public:
    MOCK_METHOD(int, quote, (std::string_view carrier, int weight), (override));
};

TEST(Booking, PicksCheapestCarrier) {
    MockCarrierGateway gateway;
    EXPECT_CALL(gateway, quote(std::string_view{"acme"}, 10)).WillOnce(Return(42));
    EXPECT_CALL(gateway, quote(std::string_view{"globex"}, 10)).WillOnce(Return(39));

    shipping::Booking booking{gateway};
    EXPECT_EQ(booking.cheapest_quote(10), 39);
}
