#ifndef CALCULATOR_HPP
#define CALCULATOR_HPP

#include <string>
#include <vector>
#include <memory>

/// A calculator class for demonstration
class Calculator {
private:
    double memory;
    std::vector<double> history;

public:
    Calculator();
    ~Calculator();

    /// Add two numbers and return result
    /// >>> Calculator calc;
    /// >>> calc.add(5.5, 4.5)
    /// 10.0
    double add(double a, double b);

    /// Subtract b from a
    /// >>> Calculator calc;
    /// >>> calc.subtract(10.0, 3.0)
    /// 7.0
    double subtract(double a, double b);

    /// Multiply two numbers
    /// >>> Calculator calc;
    /// >>> calc.multiply(3.0, 4.0)
    /// 12.0
    double multiply(double a, double b);

    /// Divide a by b
    /// >>> Calculator calc;
    /// >>> calc.divide(15.0, 3.0)
    /// 5.0
    double divide(double a, double b);

    /// Store value in memory
    /// >>> Calculator calc;
    /// >>> calc.store(42.0)
    /// >>> calc.recall()
    /// 42.0
    void store(double value);

    /// Recall value from memory
    double recall() const;

    /// Clear memory
    void clearMemory();

    /// Get calculation history
    std::vector<double> getHistory() const;

    /// Calculate power
    /// >>> Calculator calc;
    /// >>> calc.power(2.0, 3.0)
    /// 8.0
    /// >>> calc.power(5.0, 2.0)
    /// 25.0
    double power(double base, double exponent);

    /// Calculate square root
    /// >>> Calculator calc;
    /// >>> calc.sqrt(16.0)
    /// 4.0
    /// >>> calc.sqrt(9.0)
    /// 3.0
    double sqrt(double value);
};

/// String manipulation utilities
class StringCalculator {
public:
    /// Convert string to uppercase
    /// >>> StringCalculator sc;
    /// >>> sc.toUpper("hello")
    /// "HELLO"
    std::string toUpper(const std::string& str);

    /// Convert string to lowercase
    /// >>> StringCalculator sc;
    /// >>> sc.toLower("WORLD")
    /// "world"
    std::string toLower(const std::string& str);

    /// Reverse a string
    /// >>> StringCalculator sc;
    /// >>> sc.reverse("abc")
    /// "cba"
    std::string reverse(const std::string& str);

    /// Count words in a string
    /// >>> StringCalculator sc;
    /// >>> sc.countWords("hello world test")
    /// 3
    int countWords(const std::string& str);
};

#endif // CALCULATOR_HPP