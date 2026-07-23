#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int search(vector<int> &nums, int target);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> nums = args[0].get<vector<int>>();
  int target = args[1].get<int>();
  return json(search(nums, target)).dump();
}
