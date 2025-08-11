#include <iostream>
#include <iomanip>
#include "math_utils.hpp"
#include "calculator.hpp"

int main() {
    std::cout << "Testing Math Utils Library\n";
    std::cout << "==========================\n";
    
    // Test add function
    std::cout << "add(2, 3) = " << MathUtils::add(2, 3) << std::endl;
    std::cout << "add(-1, 1) = " << MathUtils::add(-1, 1) << std::endl;
    
    // Test multiply function
    std::cout << "multiply(3, 4) = " << MathUtils::multiply(3, 4) << std::endl;
    std::cout << "multiply(0, 100) = " << MathUtils::multiply(0, 100) << std::endl;
    
    // Test factorial
    std::cout << "factorial(5) = " << MathUtils::factorial(5) << std::endl;
    std::cout << "factorial(0) = " << MathUtils::factorial(0) << std::endl;
    
    // Test isPrime
    std::cout << "isPrime(7) = " << std::boolalpha << MathUtils::isPrime(7) << std::endl;
    std::cout << "isPrime(4) = " << std::boolalpha << MathUtils::isPrime(4) << std::endl;
    
    // Test fibonacci
    std::cout << "fibonacci(6) = " << MathUtils::fibonacci(6) << std::endl;
    
    std::cout << "\nTesting Calculator Class\n";
    std::cout << "========================\n";
    
    Calculator calc;
    
    std::cout << "calc.add(5.5, 4.5) = " << calc.add(5.5, 4.5) << std::endl;
    std::cout << "calc.subtract(10.0, 3.0) = " << calc.subtract(10.0, 3.0) << std::endl;
    std::cout << "calc.multiply(3.0, 4.0) = " << calc.multiply(3.0, 4.0) << std::endl;
    std::cout << "calc.divide(15.0, 3.0) = " << calc.divide(15.0, 3.0) << std::endl;
    std::cout << "calc.power(2.0, 3.0) = " << calc.power(2.0, 3.0) << std::endl;
    std::cout << "calc.sqrt(16.0) = " << calc.sqrt(16.0) << std::endl;
    
    calc.store(42.0);
    std::cout << "After store(42.0), recall() = " << calc.recall() << std::endl;
    
    std::cout << "\nTesting StringCalculator\n";
    std::cout << "========================\n";
    
    StringCalculator sc;
    std::cout << "toUpper(\"hello\") = " << sc.toUpper("hello") << std::endl;
    std::cout << "toLower(\"WORLD\") = " << sc.toLower("WORLD") << std::endl;
    std::cout << "reverse(\"abc\") = " << sc.reverse("abc") << std::endl;
    std::cout << "countWords(\"hello world test\") = " << sc.countWords("hello world test") << std::endl;
    
    return 0;
}