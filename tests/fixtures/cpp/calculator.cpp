#include "calculator.hpp"
#include <cmath>
#include <algorithm>
#include <sstream>
#include <cctype>

Calculator::Calculator() : memory(0.0) {}

Calculator::~Calculator() {}

double Calculator::add(double a, double b) {
    double result = a + b;
    history.push_back(result);
    return result;
}

double Calculator::subtract(double a, double b) {
    double result = a - b;
    history.push_back(result);
    return result;
}

double Calculator::multiply(double a, double b) {
    double result = a * b;
    history.push_back(result);
    return result;
}

double Calculator::divide(double a, double b) {
    if (b == 0) {
        throw std::runtime_error("Division by zero");
    }
    double result = a / b;
    history.push_back(result);
    return result;
}

void Calculator::store(double value) {
    memory = value;
}

double Calculator::recall() const {
    return memory;
}

void Calculator::clearMemory() {
    memory = 0.0;
}

std::vector<double> Calculator::getHistory() const {
    return history;
}

double Calculator::power(double base, double exponent) {
    double result = std::pow(base, exponent);
    history.push_back(result);
    return result;
}

double Calculator::sqrt(double value) {
    if (value < 0) {
        throw std::runtime_error("Cannot calculate square root of negative number");
    }
    double result = std::sqrt(value);
    history.push_back(result);
    return result;
}

// StringCalculator implementation

std::string StringCalculator::toUpper(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

std::string StringCalculator::toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string StringCalculator::reverse(const std::string& str) {
    std::string result = str;
    std::reverse(result.begin(), result.end());
    return result;
}

int StringCalculator::countWords(const std::string& str) {
    std::istringstream stream(str);
    std::string word;
    int count = 0;
    while (stream >> word) {
        count++;
    }
    return count;
}