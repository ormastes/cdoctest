#ifndef MATH_UTILS_HPP
#define MATH_UTILS_HPP

/// A simple math utility library for testing
namespace MathUtils {

/// Add two integers
/// >>> MathUtils::add(2, 3)
/// 5
/// >>> MathUtils::add(-1, 1)
/// 0
/// >>> MathUtils::add(100, 200)
/// 300
int add(int a, int b);

/// Multiply two integers
/// >>> MathUtils::multiply(3, 4)
/// 12
/// >>> MathUtils::multiply(0, 100)
/// 0
/// >>> MathUtils::multiply(-2, 3)
/// -6
int multiply(int a, int b);

/// Calculate factorial
/// >>> MathUtils::factorial(5)
/// 120
/// >>> MathUtils::factorial(0)
/// 1
/// >>> MathUtils::factorial(1)
/// 1
int factorial(int n);

/// Check if a number is prime
/// >>> MathUtils::isPrime(7)
/// true
/// >>> MathUtils::isPrime(4)
/// false
/// >>> MathUtils::isPrime(2)
/// true
bool isPrime(int n);

/// Calculate fibonacci number
/// >>> MathUtils::fibonacci(0)
/// 0
/// >>> MathUtils::fibonacci(1)
/// 1
/// >>> MathUtils::fibonacci(6)
/// 8
int fibonacci(int n);

}

#endif // MATH_UTILS_HPP