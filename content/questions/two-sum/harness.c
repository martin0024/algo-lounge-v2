#include "cJSON.h"
#include <stdlib.h>

int *twoSum(int *nums, int numsSize, int target, int *returnSize);

/* Decode [nums, target] from JSON, call the solver, encode the indices back. */
char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jnums = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jnums);
  int *nums = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) {
    nums[i] = (int)cJSON_GetArrayItem(jnums, i)->valuedouble;
  }
  int target = (int)cJSON_GetArrayItem(root, 1)->valuedouble;

  int returnSize = 0;
  int *res = twoSum(nums, n, target, &returnSize);

  cJSON *out = cJSON_CreateArray();
  for (int i = 0; i < returnSize; i++) {
    cJSON_AddItemToArray(out, cJSON_CreateNumber(res[i]));
  }
  char *s = cJSON_PrintUnformatted(out);

  free(nums);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
