#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

vector<int> twoSum(vector<int> &nums, int target);

/* Decode [nums, target] from JSON, call the solver, encode the indices back. */
std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> nums = args[0].get<vector<int>>();
  int target = args[1].get<int>();
  vector<int> result = twoSum(nums, target);
  return json(result).dump();
}
