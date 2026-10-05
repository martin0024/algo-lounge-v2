#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

vector<int> twoSumII(vector<int> &numbers, int target);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> numbers = args[0].get<vector<int>>();
  int target = args[1].get<int>();
  return json(twoSumII(numbers, target)).dump();
}
