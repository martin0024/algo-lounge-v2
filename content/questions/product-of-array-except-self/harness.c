#include "cJSON.h"
#include <stdlib.h>

int *productExceptSelf(int *nums, int numsSize, int *returnSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jn = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jn);
  int *nums = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    nums[i] = (int)cJSON_GetArrayItem(jn, i)->valuedouble;

  int returnSize = 0;
  int *res = productExceptSelf(nums, n, &returnSize);

  cJSON *out = cJSON_CreateArray();
  for (int i = 0; i < returnSize; i++)
    cJSON_AddItemToArray(out, cJSON_CreateNumber(res[i]));
  char *s = cJSON_PrintUnformatted(out);

  free(nums);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
