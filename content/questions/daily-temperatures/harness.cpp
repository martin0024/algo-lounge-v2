#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

vector<int> dailyTemperatures(vector<int> &temperatures);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> temperatures = args[0].get<vector<int>>();
  return json(dailyTemperatures(temperatures)).dump();
}
