#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int majorityElement(vector<int> &nums);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> nums = args[0].get<vector<int>>();
  return json(majorityElement(nums)).dump();
}
