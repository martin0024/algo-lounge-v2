#include "cJSON.h"
#include <stdlib.h>

int search(int *nums, int numsSize, int target);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jnums = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jnums);
  int *nums = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) {
    nums[i] = (int)cJSON_GetArrayItem(jnums, i)->valuedouble;
  }
  int target = (int)cJSON_GetArrayItem(root, 1)->valuedouble;

  cJSON *out = cJSON_CreateNumber(search(nums, n, target));
  char *s = cJSON_PrintUnformatted(out);

  free(nums);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
