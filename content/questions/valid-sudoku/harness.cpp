#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::string;
using std::vector;

bool isValidSudoku(vector<vector<char>> &board);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<vector<char>> board;
  for (const auto &row : args[0]) {
    vector<char> r;
    for (const auto &cell : row) r.push_back(cell.get<string>()[0]);
    board.push_back(r);
  }
  return json(isValidSudoku(board)).dump();
}
