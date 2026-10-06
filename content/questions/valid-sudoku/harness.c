#include "cJSON.h"
#include <stdbool.h>
#include <stdlib.h>

bool isValidSudoku(char **board, int boardSize, int *boardColSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jb = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jb);
  char **board = (char **)malloc(sizeof(char *) * (n > 0 ? n : 1));
  int *colSizes = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) {
    cJSON *row = cJSON_GetArrayItem(jb, i);
    int m = cJSON_GetArraySize(row);
    colSizes[i] = m;
    board[i] = (char *)malloc(sizeof(char) * (m > 0 ? m : 1));
    for (int j = 0; j < m; j++)
      board[i][j] = cJSON_GetArrayItem(row, j)->valuestring[0];
  }

  cJSON *out = cJSON_CreateBool(isValidSudoku(board, n, colSizes));
  char *s = cJSON_PrintUnformatted(out);

  for (int i = 0; i < n; i++) free(board[i]);
  free(board);
  free(colSizes);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
