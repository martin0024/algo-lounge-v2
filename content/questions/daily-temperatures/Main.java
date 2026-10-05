import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jt = in.get(0).getAsJsonArray();
        int[] temperatures = new int[jt.size()];
        for (int i = 0; i < jt.size(); i++) temperatures[i] = jt.get(i).getAsInt();

        int[] result = new Solution().dailyTemperatures(temperatures);
        System.out.println(new Gson().toJson(result));
    }
}
