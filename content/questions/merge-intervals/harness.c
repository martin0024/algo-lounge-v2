#include "cJSON.h"
#include <stdlib.h>

int **merge(int **intervals, int intervalsSize, int *intervalsColSize,
            int *returnSize, int **returnColumnSizes);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *ji = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(ji);
  int **intervals = (int **)malloc(sizeof(int *) * (n > 0 ? n : 1));
  int *colSizes = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) {
    cJSON *row = cJSON_GetArrayItem(ji, i);
    int m = cJSON_GetArraySize(row);
    colSizes[i] = m;
    intervals[i] = (int *)malloc(sizeof(int) * (m > 0 ? m : 1));
    for (int j = 0; j < m; j++)
      intervals[i][j] = (int)cJSON_GetArrayItem(row, j)->valuedouble;
  }

  int returnSize = 0;
  int *returnColumnSizes = NULL;
  int **res = merge(intervals, n, colSizes, &returnSize, &returnColumnSizes);

  cJSON *out = cJSON_CreateArray();
  for (int i = 0; i < returnSize; i++) {
    cJSON *row = cJSON_CreateArray();
    for (int j = 0; j < returnColumnSizes[i]; j++)
      cJSON_AddItemToArray(row, cJSON_CreateNumber(res[i][j]));
    cJSON_AddItemToArray(out, row);
  }
  char *s = cJSON_PrintUnformatted(out);

  for (int i = 0; i < n; i++) free(intervals[i]);
  free(intervals);
  free(colSizes);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
